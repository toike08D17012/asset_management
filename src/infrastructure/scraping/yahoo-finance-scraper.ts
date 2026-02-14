import type { Currency, SecurityType } from "@/domain/types";
import { eq, inArray } from "drizzle-orm";

export interface YahooMarketData {
  readonly sector: string | null;
  readonly dividendYield: number | null; // 0.035 = 3.5%
  readonly currentPrice: number | null;
  readonly yahooSymbol: string;
  readonly googleSymbol: string;
}

export interface MarketDataInput {
  readonly ticker: string;
  readonly currency: Currency;
  readonly securityType: SecurityType;
}

export interface MarketDataBatchOptions {
  readonly minIntervalMs?: number;
  readonly forceRefresh?: boolean;
}

export interface MarketDataCacheReadOptions {
  readonly allowStale?: boolean;
  readonly todayOnly?: boolean;
}

type MarketDataSourceMode = "api" | "scraping" | "auto";

export interface YahooMarketDataFetchOptions {
  readonly forceRefresh?: boolean;
}

type CacheEntry = {
  readonly expiresAt: number;
  readonly value: YahooMarketData | null;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const memoryMarketDataCache = new Map<string, CacheEntry>();
const DEFAULT_BATCH_INTERVAL_MS = 250;

const YAHOO_JP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type YahooPreloadedState = {
  readonly mainStocksPriceBoard?: {
    readonly priceBoard?: {
      readonly industry?: {
        readonly industryName?: string;
      };
      readonly shareDividendYield?: number | string;
      readonly price?: number | string;
    };
  };
  readonly mainStocksDetail?: {
    readonly referenceIndex?: {
      readonly shareDividendYield?: number | string;
    };
  };
};

/**
 * Yahoo Finance 用に銘柄コードを正規化
 */
export function normalizeYahooSymbol(input: MarketDataInput): string | null {
  const raw = input.ticker.trim();
  if (!raw) return null;

  // アプリ内の投資信託疑似ティッカーはYahoo対象外
  if (raw.startsWith("FUND-") || raw.startsWith("SBI-") || raw.startsWith("EMAXIS-")) {
    return null;
  }

  // 既に市場サフィックス付きの場合はそのまま利用
  if (raw.includes(".")) {
    return raw.toUpperCase();
  }

  // 日本株コード (例: 7203 -> 7203.T)
  if (input.currency === "JPY" && /^\d{4,5}$/.test(raw)) {
    return `${raw}.T`;
  }

  return raw.toUpperCase();
}

/**
 * Google Finance 用のシンボルを返す
 */
export function toGoogleFinanceSymbol(input: MarketDataInput): string {
  const raw = input.ticker.trim();
  if (input.currency === "JPY" && /^\d{4,5}$/.test(raw)) {
    return `TYO:${raw}`;
  }
  return raw.toUpperCase();
}

export async function fetchYahooMarketData(
  input: MarketDataInput,
  options?: YahooMarketDataFetchOptions,
): Promise<YahooMarketData | null> {
  const symbol = normalizeYahooSymbol(input);
  const googleSymbol = toGoogleFinanceSymbol(input);
  if (!symbol) {
    return null;
  }

  const forceRefresh = options?.forceRefresh ?? false;

  const mode = getMarketDataSourceMode();

  // プロセス内キャッシュを優先（同一プロセスでの過剰アクセス抑止）
  if (!forceRefresh) {
    const cached = memoryMarketDataCache.get(symbol);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
  }

  const todayJst = getTodayJst();

  if (!forceRefresh) {
    const persisted = await getPersistedMarketDataForToday(input, todayJst, mode);
    if (persisted.hit) {
      return persisted.data;
    }
  }

  const data = await fetchMarketDataByMode(symbol, googleSymbol);

  const now = Date.now();
  memoryMarketDataCache.set(symbol, {
    expiresAt: now + CACHE_TTL_MS,
    value: data,
  });

  await savePersistedMarketData(input, symbol, googleSymbol, todayJst, data);

  return data;
}

function getMarketDataSourceMode(): MarketDataSourceMode {
  const raw = process.env.MARKET_DATA_SOURCE_MODE?.toLowerCase();
  if (raw === "api" || raw === "scraping" || raw === "auto") {
    return raw;
  }
  return "auto";
}

async function fetchMarketDataByMode(
  symbol: string,
  googleSymbol: string,
): Promise<YahooMarketData | null> {
  const mode = getMarketDataSourceMode();

  if (mode === "api") {
    return fetchFromYahooQuoteApi(symbol, googleSymbol);
  }

  if (mode === "scraping") {
    return fetchFromYahooJapanPage(symbol, googleSymbol);
  }

  const fromApi = await fetchFromYahooQuoteApi(symbol, googleSymbol);
  if (fromApi) {
    return fromApi;
  }
  return fetchFromYahooJapanPage(symbol, googleSymbol);
}

async function fetchFromYahooQuoteApi(
  symbol: string,
  googleSymbol: string,
): Promise<YahooMarketData | null> {
  try {
    const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    url.searchParams.set("symbols", symbol);

    const response = await fetch(url, {
      headers: {
        "User-Agent": YAHOO_JP_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const quote = payload?.quoteResponse?.result?.[0];
    if (!quote) {
      return null;
    }

    const sectorRaw = quote?.sector ?? quote?.industryDisp ?? quote?.industry;
    const sector =
      typeof sectorRaw === "string" && sectorRaw.trim().length > 0
        ? sectorRaw.trim()
        : null;

    const dyRaw = quote?.trailingAnnualDividendYield ?? quote?.dividendYield;
    const dy = toFiniteNumber(dyRaw);
    const dividendYield = dy !== null && dy >= 0 ? dy : null;

    const currentPrice = toFiniteNumber(quote?.regularMarketPrice ?? quote?.postMarketPrice);

    return {
      sector,
      dividendYield,
      currentPrice,
      yahooSymbol: symbol,
      googleSymbol,
    };
  } catch {
    return null;
  }
}

export function marketDataInputKey(input: MarketDataInput): string {
  return `${input.ticker}:${input.currency}:${input.securityType}`;
}

/**
 * 同時アクセスを避けるため、銘柄ごとに時間差で市場データを取得する。
 * - 同一銘柄入力は自動で重複排除
 * - 既存のDB/メモリキャッシュは fetchYahooMarketData 内で適用
 */
export async function fetchYahooMarketDataBatch(
  inputs: MarketDataInput[],
  options?: MarketDataBatchOptions,
): Promise<Map<string, YahooMarketData | null>> {
  const minIntervalMs = options?.minIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
  const forceRefresh = options?.forceRefresh ?? false;

  const uniqueInputs = new Map<string, MarketDataInput>();
  for (const input of inputs) {
    uniqueInputs.set(marketDataInputKey(input), input);
  }

  const results = new Map<string, YahooMarketData | null>();
  let isFirst = true;

  for (const [key, input] of uniqueInputs) {
    if (!isFirst && minIntervalMs > 0) {
      await sleep(minIntervalMs);
    }
    isFirst = false;

    const marketData = await fetchYahooMarketData(input, { forceRefresh });
    results.set(key, marketData);
  }

  return results;
}

/**
 * DBキャッシュから市場データをバッチ取得する（外部アクセスなし）
 */
export async function getYahooMarketDataBatchFromCache(
  inputs: MarketDataInput[],
  options?: MarketDataCacheReadOptions,
): Promise<Map<string, YahooMarketData | null>> {
  const allowStale = options?.allowStale ?? true;
  const todayOnly = options?.todayOnly ?? false;
  const todayJst = getTodayJst();

  const uniqueInputs = new Map<string, MarketDataInput>();
  for (const input of inputs) {
    uniqueInputs.set(marketDataInputKey(input), input);
  }

  const keys = Array.from(uniqueInputs.keys());
  if (keys.length === 0) return new Map();

  try {
    const [{ getDb }, { marketDataCache: marketDataCacheTable }] = await Promise.all([
      import("@/infrastructure/database/connection"),
      import("@/infrastructure/database/schema"),
    ]);

    const db = getDb();
    const rows = await db
      .select()
      .from(marketDataCacheTable)
      .where(inArray(marketDataCacheTable.id, keys));

    const rowMap = new Map(rows.map((row) => [row.id, row]));
    const result = new Map<string, YahooMarketData | null>();

    for (const key of keys) {
      const row = rowMap.get(key);
      if (!row) continue;

      if (todayOnly && row.fetchedDate !== todayJst) {
        continue;
      }

      if (!allowStale && row.fetchedDate !== todayJst) {
        continue;
      }

      if (!row.yahooSymbol) {
        result.set(key, null);
        continue;
      }

      result.set(key, {
        sector: row.sector,
        dividendYield: row.dividendYield,
        currentPrice: null,
        yahooSymbol: row.yahooSymbol,
        googleSymbol: row.googleSymbol,
      });
    }

    return result;
  } catch {
    return new Map();
  }
}

async function fetchFromYahooJapanPage(
  symbol: string,
  googleSymbol: string,
): Promise<YahooMarketData | null> {
  try {
    const url = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(symbol)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": YAHOO_JP_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        Referer: "https://finance.yahoo.co.jp/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parsed = parseYahooJapanHtml(html);
    if (!parsed) {
      return null;
    }

    return {
      sector: parsed.sector,
      dividendYield: parsed.dividendYield,
      currentPrice: parsed.currentPrice,
      yahooSymbol: symbol,
      googleSymbol,
    };
  } catch {
    return null;
  }
}

export function parseYahooJapanHtml(html: string): {
  sector: string | null;
  dividendYield: number | null;
  currentPrice: number | null;
} | null {
  const state = extractPreloadedState(html);
  if (state) {
    const sectorRaw = state.mainStocksPriceBoard?.priceBoard?.industry?.industryName;
    const sector = typeof sectorRaw === "string" && sectorRaw.trim().length > 0
      ? sectorRaw.trim()
      : null;

    const dividendRaw =
      state.mainStocksPriceBoard?.priceBoard?.shareDividendYield ??
      state.mainStocksDetail?.referenceIndex?.shareDividendYield;

    const dividendPercent = toFiniteNumber(dividendRaw);
    const dividendYield =
      dividendPercent !== null && dividendPercent >= 0 ? dividendPercent / 100 : null;

    const currentPriceRaw = state.mainStocksPriceBoard?.priceBoard?.price;
    const currentPrice = toFiniteNumber(currentPriceRaw);

    if (sector !== null || dividendYield !== null || currentPrice !== null) {
      return {
        sector,
        dividendYield,
        currentPrice,
      };
    }
  }

  // フォールバック: 埋め込みJSONの構造変更時でも最低限抽出する
  const sectorMatch = html.match(/"industryName"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  const sector = sectorMatch?.[1] ? decodeJsonString(sectorMatch[1]).trim() || null : null;

  const dividendMatch = html.match(
    /"shareDividendYield"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9]+(?:\.[0-9]+)?))/
  );
  const dividendRaw = dividendMatch?.[1] ?? dividendMatch?.[2] ?? null;
  const dividendPercent = toFiniteNumber(dividendRaw);
  const dividendYield =
    dividendPercent !== null && dividendPercent >= 0 ? dividendPercent / 100 : null;

  const contextualPriceMatch = html.match(
    /"mainStocksPriceBoard"[\s\S]*?"priceBoard"[\s\S]*?"price"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9]+(?:\.[0-9]+)?))/
  );
  const priceMatch =
    contextualPriceMatch ??
    html.match(/"price"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9]+(?:\.[0-9]+)?))/);
  const currentPriceRaw = priceMatch?.[1] ?? priceMatch?.[2] ?? null;
  const currentPrice = toFiniteNumber(currentPriceRaw);

  if (sector === null && dividendYield === null && currentPrice === null) {
    return null;
  }

  return {
    sector,
    dividendYield,
    currentPrice,
  };
}

export function extractPreloadedState(html: string): YahooPreloadedState | null {
  const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*<\/script>/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]) as YahooPreloadedState;
  } catch {
    return null;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/,/g, "")
      .replace(/[％%]/g, "")
      .trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function getTodayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function cacheKey(input: MarketDataInput): string {
  return marketDataInputKey(input);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPersistedMarketDataForToday(
  input: MarketDataInput,
  todayJst: string,
  mode: MarketDataSourceMode,
): Promise<{ hit: boolean; data: YahooMarketData | null }> {
  try {
    const [{ getDb }, { marketDataCache: marketDataCacheTable }] = await Promise.all([
      import("@/infrastructure/database/connection"),
      import("@/infrastructure/database/schema"),
    ]);

    const db = getDb();
    const id = cacheKey(input);
    const rows = await db
      .select()
      .from(marketDataCacheTable)
      .where(eq(marketDataCacheTable.id, id))
      .limit(1);

    if (rows.length === 0) return { hit: false, data: null };
    const row = rows[0];
    if (row.fetchedDate !== todayJst) return { hit: false, data: null };

    // 同日取得済み（失敗キャッシュ含む）
    if (!row.yahooSymbol) {
      // API専用モードは同日再試行しない
      // auto/scraping は API失敗時の救済のため再試行を許可
      if (mode === "api") {
        return { hit: true, data: null };
      }
      return { hit: false, data: null };
    }

    // セクター・配当利回りとも空の場合、scraping/autoでは再取得対象にする
    if (row.sector == null && row.dividendYield == null) {
      if (mode === "api") {
        return {
          hit: true,
          data: {
            sector: row.sector,
            dividendYield: row.dividendYield,
            currentPrice: null,
            yahooSymbol: row.yahooSymbol,
            googleSymbol: row.googleSymbol,
          },
        };
      }
      return { hit: false, data: null };
    }

    return {
      hit: true,
      data: {
        sector: row.sector,
        dividendYield: row.dividendYield,
        currentPrice: null,
        yahooSymbol: row.yahooSymbol,
        googleSymbol: row.googleSymbol,
      },
    };
  } catch {
    return { hit: false, data: null };
  }
}

async function savePersistedMarketData(
  input: MarketDataInput,
  yahooSymbol: string,
  googleSymbol: string,
  todayJst: string,
  data: YahooMarketData | null,
): Promise<void> {
  try {
    const [{ getDb }, { marketDataCache: marketDataCacheTable }] = await Promise.all([
      import("@/infrastructure/database/connection"),
      import("@/infrastructure/database/schema"),
    ]);

    const db = getDb();
    const id = cacheKey(input);

    await db
      .insert(marketDataCacheTable)
      .values({
        id,
        ticker: input.ticker,
        currency: input.currency,
        securityType: input.securityType,
        yahooSymbol: data?.yahooSymbol ?? null,
        googleSymbol,
        sector: data?.sector ?? null,
        dividendYield: data?.dividendYield ?? null,
        fetchedDate: todayJst,
        fetchedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: marketDataCacheTable.id,
        set: {
          yahooSymbol: data?.yahooSymbol ?? null,
          googleSymbol,
          sector: data?.sector ?? null,
          dividendYield: data?.dividendYield ?? null,
          fetchedDate: todayJst,
          fetchedAt: new Date().toISOString(),
        },
      });
  } catch {
    // キャッシュ保存失敗時は無視（本処理は継続）
  }
}
