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
  readonly name?: string;
  readonly currency: Currency;
  readonly securityType: SecurityType;
}

export interface MarketDataBatchOptions {
  readonly minIntervalMs?: number;
  readonly forceRefresh?: boolean;
  readonly forceResolveSymbol?: boolean;
}

export interface MarketDataCacheReadOptions {
  readonly allowStale?: boolean;
  readonly todayOnly?: boolean;
}

type MarketDataSourceMode = "api" | "scraping" | "auto";

export interface YahooMarketDataFetchOptions {
  readonly forceRefresh?: boolean;
  readonly forceResolveSymbol?: boolean;
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
const YAHOO_JP_SEARCH_URL_BUILDERS = [
  (query: string) => `https://finance.yahoo.co.jp/search?p=${encodeURIComponent(query)}`,
  (query: string) => `https://finance.yahoo.co.jp/search/?query=${encodeURIComponent(query)}`,
];
const MUTUAL_FUND_SYMBOL_OVERRIDES_BY_NAME: Record<string, string> = {
  [normalizeMutualFundLookupKey("ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）")]:
    "8931C242",
  [normalizeMutualFundLookupKey("ＳＢＩ日本高配当株式（分配）ファンド（年４回決算型）")]:
    "8931123C",
};

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
  readonly mainFundPriceBoard?: {
    readonly fundPrices?: {
      readonly price?: number | string;
      readonly distributionYield?: number | string;
      readonly distributionRate?: number | string;
      readonly annualDistributionYield?: number | string;
      readonly yieldRate?: number | string;
    };
    readonly fundDetail?: {
      readonly distributionYield?: number | string;
      readonly distributionRate?: number | string;
      readonly annualDistributionYield?: number | string;
      readonly yieldRate?: number | string;
    };
  };
  readonly mainFundDetail?: {
    readonly items?: {
      readonly settlementFrequency?: number | string;
      readonly recentDividend?: number | string;
    };
  };
  readonly mainFundReferenceInformation?: {
    readonly referenceInformation?: {
      readonly settlementAndDividend?: {
        readonly settlementFrequency?: number | string;
        readonly recentDividend?: number | string;
        readonly dividendYield?: number | string;
      };
    };
  };
  readonly mainStocksDetail?: {
    readonly referenceIndex?: {
      readonly shareDividendYield?: number | string;
    };
  };
  readonly pageInfo?: {
    readonly itemType?: string;
    readonly jwtToken?: string;
  };
};

type YahooFundReferenceInformationPayload = {
  readonly settlementAndDividend?: {
    readonly settlementFrequency?: number | string;
    readonly settlementLatestDate?: string;
    readonly recentDividend?: number | string;
    readonly dividendYield?: number | string;
  };
  readonly referenceInformation?: {
    readonly settlementAndDividend?: {
      readonly settlementFrequency?: number | string;
      readonly settlementLatestDate?: string;
      readonly recentDividend?: number | string;
      readonly dividendYield?: number | string;
    };
  };
};

/**
 * Yahoo Finance 用に銘柄コードを正規化
 */
export function normalizeYahooSymbol(input: MarketDataInput): string | null {
  const raw = input.ticker.trim();
  if (!raw) return null;

  if (input.securityType === "mutualFund") {
    const override = getMutualFundSymbolOverride(input.name);
    if (override) {
      return override;
    }

    // アプリ内の投信擬似ティッカーはYahooの正式コードではない
    if (isPseudoMutualFundTicker(raw)) {
      return null;
    }

    // Yahooの投信コードらしい値 (例: 0331418A) はそのまま利用
    if (isLikelyMutualFundCode(raw)) {
      return raw.toUpperCase();
    }

    // 銘柄名(日本語/空白含む)は直接URLに使えないため検索で解決する
    if (hasNonAscii(raw) || /\s/u.test(raw)) {
      return null;
    }

    // 米国投信ティッカー等はそのまま利用
    return raw.toUpperCase();
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
    return `${raw}:TYO`;
  }
  return raw.toUpperCase();
}

export async function fetchYahooMarketData(
  input: MarketDataInput,
  options?: YahooMarketDataFetchOptions,
): Promise<YahooMarketData | null> {
  const normalizedSymbol = normalizeYahooSymbol(input);
  const googleSymbol = toGoogleFinanceSymbol(input);
  if (!normalizedSymbol && input.securityType !== "mutualFund") {
    return null;
  }

  const forceRefresh = options?.forceRefresh ?? false;
  const forceResolveSymbol = options?.forceResolveSymbol ?? false;
  const memoryCacheKey = buildMemoryCacheKey(input);

  const mode = getMarketDataSourceMode();

  // プロセス内キャッシュを優先（同一プロセスでの過剰アクセス抑止）
  if (!forceRefresh) {
    const cached = memoryMarketDataCache.get(memoryCacheKey);
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

  const cachedResolvedSymbol =
    input.securityType === "mutualFund" && !forceResolveSymbol
      ? await getPersistedYahooSymbol(input)
      : null;
  const preferredSymbol = normalizedSymbol ?? cachedResolvedSymbol;

  const data = await fetchMarketDataByMode(input, preferredSymbol, googleSymbol, forceResolveSymbol);
  const resolvedSymbol = data?.yahooSymbol ?? preferredSymbol;

  const now = Date.now();
  memoryMarketDataCache.set(memoryCacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    value: data,
  });

  if (resolvedSymbol) {
    await savePersistedYahooSymbol(input, resolvedSymbol);
  }

  await savePersistedMarketData(input, googleSymbol, todayJst, data, resolvedSymbol);

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
  input: MarketDataInput,
  symbol: string | null,
  googleSymbol: string,
  forceResolveSymbol: boolean,
): Promise<YahooMarketData | null> {
  const mode = getMarketDataSourceMode();

  if (mode === "api") {
    if (!symbol) {
      return null;
    }
    return fetchFromYahooQuoteApi(symbol, googleSymbol);
  }

  if (mode === "scraping") {
    return fetchFromYahooJapanPage(input, symbol, googleSymbol, forceResolveSymbol);
  }

  // auto: まず .com API を優先し、取得できなかった場合のみ Yahoo!ファイナンス日本版へフォールバック
  if (symbol) {
    const fromApi = await fetchFromYahooQuoteApi(symbol, googleSymbol);
    if (fromApi) {
      return fromApi;
    }
  }

  return fetchFromYahooJapanPage(input, symbol, googleSymbol, forceResolveSymbol);
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
  const forceResolveSymbol = options?.forceResolveSymbol ?? false;

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

    const marketData = await fetchYahooMarketData(input, { forceRefresh, forceResolveSymbol });
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
        currentPrice: row.currentPrice,
        yahooSymbol: row.yahooSymbol,
        googleSymbol: row.googleSymbol,
      });
    }

    return result;
  } catch (error) {
    logMarketDataDebug("getYahooMarketDataBatchFromCache", error);
    return new Map();
  }
}

async function fetchFromYahooJapanPage(
  input: MarketDataInput,
  preferredSymbol: string | null,
  googleSymbol: string,
  forceResolveSymbol: boolean,
): Promise<YahooMarketData | null> {
  const resolved = await resolveYahooSymbolAndDataFromYahooJapan(
    input,
    preferredSymbol,
    forceResolveSymbol && input.securityType === "mutualFund",
  );
  if (!resolved) {
    return null;
  }

  return {
    sector: resolved.data.sector,
    dividendYield: resolved.data.dividendYield,
    currentPrice: resolved.data.currentPrice,
    yahooSymbol: resolved.symbol,
    googleSymbol,
  };
}

async function resolveYahooSymbolAndDataFromYahooJapan(
  input: MarketDataInput,
  preferredSymbol: string | null,
  skipPreferredSymbol: boolean,
): Promise<{
  symbol: string;
  data: {
    sector: string | null;
    dividendYield: number | null;
    currentPrice: number | null;
  };
} | null> {
  const triedSymbols = new Set<string>();

  const trySymbol = async (candidate: string | null): Promise<{
    symbol: string;
    data: {
      sector: string | null;
      dividendYield: number | null;
      currentPrice: number | null;
    };
  } | null> => {
    const symbol = normalizeExtractedYahooSymbol(candidate);
    if (!symbol || triedSymbols.has(symbol)) {
      return null;
    }

    triedSymbols.add(symbol);
    const data = await fetchYahooJapanQuotePage(symbol);
    if (!data) {
      return null;
    }

    return { symbol, data };
  };

  if (!skipPreferredSymbol) {
    const preferredResult = await trySymbol(preferredSymbol);
    if (preferredResult) {
      return preferredResult;
    }
  }

  if (input.securityType !== "mutualFund") {
    return null;
  }

  const queries = buildYahooSearchQueries(input);
  for (const query of queries) {
    const symbols = await searchYahooSymbols(query);
    for (const symbol of symbols) {
      const resolved = await trySymbol(symbol);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function buildYahooSearchQueries(input: MarketDataInput): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  const addQuery = (value: string | undefined): void => {
    const query = value?.trim();
    if (!query || seen.has(query)) {
      return;
    }
    seen.add(query);
    queries.push(query);
  };

  if (input.securityType === "mutualFund") {
    // 投資信託は正式名称を主キーとしてURLを解決する
    addQuery(input.name);
    if (queries.length === 0) {
      addQuery(input.ticker);
    }
    return queries;
  }

  addQuery(input.ticker);
  addQuery(input.name);

  return queries;
}

async function searchYahooSymbols(query: string): Promise<string[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  // .co.jp の検索結果ページからのみ候補を抽出する
  return searchYahooSymbolsWithHtml(normalizedQuery);
}

async function searchYahooSymbolsWithHtml(query: string): Promise<string[]> {
  for (const buildUrl of YAHOO_JP_SEARCH_URL_BUILDERS) {
    const url = buildUrl(query);
    try {
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
        continue;
      }

      const html = await response.text();
      const symbols = rankYahooSymbolsByQueryFromSearchHtml(html, query);

      if (symbols.length > 0) {
        return symbols;
      }
    } catch {
      // 次のURLパターンで再試行する
    }
  }

  return [];
}

export function extractYahooSymbolsFromSearchHtml(html: string): string[] {
  const candidates = extractYahooSearchCandidatesFromHtml(html);
  const symbols: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.symbol)) {
      continue;
    }

    seen.add(candidate.symbol);
    symbols.push(candidate.symbol);
  }

  return symbols;
}

export function rankYahooSymbolsByQueryFromSearchHtml(html: string, query: string): string[] {
  const normalizedQuery = normalizeMutualFundLookupKey(query);
  const candidates = extractYahooSearchCandidatesFromHtml(html);
  if (candidates.length === 0) {
    return extractYahooSymbolsFromLoosePatterns(html);
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreYahooSearchCandidate(candidate, normalizedQuery),
    }))
    .sort((a, b) => {
      if (a.score === b.score) {
        return a.candidate.index - b.candidate.index;
      }
      return b.score - a.score;
    });

  const symbols: string[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    if (seen.has(item.candidate.symbol)) {
      continue;
    }
    seen.add(item.candidate.symbol);
    symbols.push(item.candidate.symbol);
  }

  return symbols;
}

type YahooSearchCandidate = {
  symbol: string;
  label: string;
  index: number;
};

function extractYahooSearchCandidatesFromHtml(html: string): YahooSearchCandidate[] {
  const candidates: YahooSearchCandidate[] = [];
  const pattern =
    /<a\b[^>]*href=["'](?:https?:\/\/finance\.yahoo\.co\.jp)?\/quote\/([^"'?#/]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  let index = 0;
  for (const match of html.matchAll(pattern)) {
    const symbol = normalizeExtractedYahooSymbol(match[1]);
    if (!symbol) {
      continue;
    }

    const rawLabel = match[2] ?? "";
    const label = normalizeMutualFundLookupKey(decodeHtmlEntities(stripHtmlTags(rawLabel)));

    candidates.push({
      symbol,
      label,
      index,
    });
    index += 1;
  }

  return candidates;
}

function extractYahooSymbolsFromLoosePatterns(html: string): string[] {
  const symbols: string[] = [];
  const seen = new Set<string>();
  const pattern = /(?:https?:\/\/finance\.yahoo\.co\.jp)?\/quote\/([^"'?#/]+)[^"'?#]*/gi;

  for (const match of html.matchAll(pattern)) {
    const symbol = normalizeExtractedYahooSymbol(match[1]);
    if (!symbol || seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    symbols.push(symbol);
  }

  return symbols;
}

function scoreYahooSearchCandidate(candidate: YahooSearchCandidate, normalizedQuery: string): number {
  let score = 0;

  if (normalizedQuery.length > 0 && candidate.label.length > 0) {
    if (candidate.label === normalizedQuery) {
      score += 1000;
    } else if (candidate.label.includes(normalizedQuery)) {
      score += 700;
    } else if (normalizedQuery.includes(candidate.label)) {
      score += 500;
    }

    score += Math.min(getCommonPrefixLength(candidate.label, normalizedQuery), 120);
  }

  return score - candidate.index;
}

function getCommonPrefixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) {
    i += 1;
  }
  return i;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

async function fetchYahooJapanQuotePage(symbol: string): Promise<{
  sector: string | null;
  dividendYield: number | null;
  currentPrice: number | null;
} | null> {
  try {
    const quoteUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(symbol)}`;

    const response = await fetch(quoteUrl, {
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

    const state = extractPreloadedState(html);
    const isFundPage =
      state?.pageInfo?.itemType === "fund" || state?.mainFundPriceBoard !== undefined;
    if (!isFundPage) {
      return parsed;
    }

    const jwtToken = state?.pageInfo?.jwtToken;
    const dividendYieldFromReferenceApi =
      jwtToken === undefined
        ? null
        : await fetchYahooJapanFundReferenceDividendYield(symbol, jwtToken, quoteUrl);

    if (dividendYieldFromReferenceApi === null) {
      return parsed;
    }

    return {
      ...parsed,
      dividendYield: dividendYieldFromReferenceApi,
    };
  } catch {
    return null;
  }
}

async function fetchYahooJapanFundReferenceDividendYield(
  symbol: string,
  jwtToken: string,
  quoteUrl: string,
): Promise<number | null> {
  const token = jwtToken.trim();
  if (!token) {
    return null;
  }

  try {
    const url = new URL("https://finance.yahoo.co.jp/bff-pc/v1/main/fund/reference/information");
    url.searchParams.set("fundCode", symbol);

    const response = await fetch(url, {
      headers: {
        "User-Agent": YAHOO_JP_USER_AGENT,
        Accept: "application/json",
        "jwt-token": token,
        Referer: quoteUrl,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as YahooFundReferenceInformationPayload;
    return parseYahooJapanFundReferenceInformationDividendYield(payload);
  } catch {
    return null;
  }
}

export function parseYahooJapanFundReferenceInformationDividendYield(
  payload: YahooFundReferenceInformationPayload | null | undefined,
): number | null {
  const settlementAndDividend =
    payload?.settlementAndDividend ?? payload?.referenceInformation?.settlementAndDividend;
  const dividendPercent = toFiniteNumber(settlementAndDividend?.dividendYield ?? null);
  if (dividendPercent === null || dividendPercent < 0) {
    return null;
  }
  return normalizeDividendPercent(dividendPercent);
}

export function parseYahooJapanHtml(html: string): {
  sector: string | null;
  dividendYield: number | null;
  currentPrice: number | null;
} | null {
  const state = extractPreloadedState(html);
  const plainText = htmlToPlainText(html);

  const supplementalSector = extractSectorFromHtml(html, plainText);
  const supplementalDividendYield = extractDividendYieldFromHtml(html, plainText);
  const supplementalCurrentPrice = extractCurrentPriceFromHtml(html, plainText);

  if (state) {
    const sectorRaw = state.mainStocksPriceBoard?.priceBoard?.industry?.industryName;
    const sectorFromState =
      typeof sectorRaw === "string" && sectorRaw.trim().length > 0 ? sectorRaw.trim() : null;
    const sector = sectorFromState ?? supplementalSector;

    const currentPriceRaw =
      state.mainStocksPriceBoard?.priceBoard?.price ??
      state.mainFundPriceBoard?.fundPrices?.price;
    const currentPriceFromState = toFiniteNumber(currentPriceRaw);
    const currentPrice = currentPriceFromState ?? supplementalCurrentPrice;

    const settlementAndDividend =
      state.mainFundReferenceInformation?.referenceInformation?.settlementAndDividend;
    const dividendRaw =
      state.mainStocksPriceBoard?.priceBoard?.shareDividendYield ??
      state.mainStocksDetail?.referenceIndex?.shareDividendYield ??
      settlementAndDividend?.dividendYield ??
      state.mainFundPriceBoard?.fundDetail?.distributionYield ??
      state.mainFundPriceBoard?.fundDetail?.distributionRate ??
      state.mainFundPriceBoard?.fundDetail?.annualDistributionYield ??
      state.mainFundPriceBoard?.fundDetail?.yieldRate ??
      state.mainFundPriceBoard?.fundPrices?.distributionYield ??
      state.mainFundPriceBoard?.fundPrices?.distributionRate ??
      state.mainFundPriceBoard?.fundPrices?.annualDistributionYield ??
      state.mainFundPriceBoard?.fundPrices?.yieldRate;

    const dividendPercentFromState = toFiniteNumber(dividendRaw);
    const dividendYieldFromState =
      dividendPercentFromState !== null && dividendPercentFromState >= 0
        ? normalizeDividendPercent(dividendPercentFromState)
        : null;
    const recentDistribution = toFiniteNumber(
      state.mainFundDetail?.items?.recentDividend ?? settlementAndDividend?.recentDividend
    );
    const settlementFrequency = toFiniteNumber(
      state.mainFundDetail?.items?.settlementFrequency ?? settlementAndDividend?.settlementFrequency
    );
    const dividendYieldFromRecentDistribution = deriveDistributionYieldFromRecentDistribution(
      recentDistribution,
      settlementFrequency,
      currentPrice
    );
    const derivedDistributionYield = extractDistributionYieldFromSummaryText(
      plainText,
      currentPrice
    );
    const dividendYield =
      dividendYieldFromState ??
      supplementalDividendYield ??
      dividendYieldFromRecentDistribution ??
      derivedDistributionYield;

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
  const sectorFromFallback =
    sectorMatch?.[1] ? decodeJsonString(sectorMatch[1]).trim() || null : null;
  const sector = sectorFromFallback ?? supplementalSector;

  const dividendMatch = html.match(
    /"(?:shareDividendYield|distributionYield|distributionRate|annualDistributionYield|yieldRate|dividendYield)"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9]+(?:\.[0-9]+)?))/
  );
  const dividendRaw = dividendMatch?.[1] ?? dividendMatch?.[2] ?? null;
  const dividendPercent = toFiniteNumber(dividendRaw);
  const dividendYieldFromFallback =
    dividendPercent !== null && dividendPercent >= 0 ? normalizeDividendPercent(dividendPercent) : null;

  const contextualPriceMatch = html.match(
    /"mainStocksPriceBoard"[\s\S]*?"priceBoard"[\s\S]*?"price"\s*:\s*(?:"([0-9０-９,，]+(?:[\.．][0-9０-９]+)?(?:\s*(?:円|JPY))?)"|([0-9]+(?:\.[0-9]+)?))/
  );
  const fundContextualPriceMatch = html.match(
    /"mainFundPriceBoard"[\s\S]*?"fundPrices"[\s\S]*?"price"\s*:\s*(?:"([0-9０-９,，]+(?:[\.．][0-9０-９]+)?(?:\s*(?:円|JPY))?)"|([0-9]+(?:\.[0-9]+)?))/
  );
  const priceMatch =
    contextualPriceMatch ??
    fundContextualPriceMatch;
  const currentPriceRaw = priceMatch?.[1] ?? priceMatch?.[2] ?? null;
  const currentPriceFromFallback = toFiniteNumber(currentPriceRaw);
  const currentPrice = currentPriceFromFallback ?? supplementalCurrentPrice;
  const derivedDistributionYield = extractDistributionYieldFromSummaryText(
    plainText,
    currentPrice
  );
  const dividendYield =
    dividendYieldFromFallback ?? supplementalDividendYield ?? derivedDistributionYield;

  if (sector === null && dividendYield === null && currentPrice === null) {
    return null;
  }

  return {
    sector,
    dividendYield,
    currentPrice,
  };
}

function extractSectorFromHtml(html: string, plainText: string): string | null {
  const jsonMatch = html.match(
    /"(?:categoryName|assetTypeName|fundTypeName|industryName)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
  );
  if (jsonMatch?.[1]) {
    const decoded = decodeJsonString(jsonMatch[1]).trim();
    if (decoded.length > 0) {
      return decoded;
    }
  }

  const textMatch = plainText.match(/(?:分類|カテゴリ|アセットクラス)\s*[:：]?\s*([^\s]{2,30})/u);
  return textMatch?.[1] ?? null;
}

function extractDividendYieldFromHtml(html: string, plainText: string): number | null {
  const fromJson = extractNumberByPatterns(html, [
    /"(?:shareDividendYield|distributionYield|distributionRate|annualDistributionYield|yieldRate|dividendYield)"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9]+(?:\.[0-9]+)?))/,
  ]);
  if (fromJson !== null && fromJson >= 0) {
    return normalizeDividendPercent(fromJson);
  }

  const textMatch = plainText.match(
    /(?:分配金利回り|利回り|配当利回り)\s*[:：]?\s*([0-9０-９][0-9０-９,，]*(?:[\.．][0-9０-９]+)?)\s*[%％]/u
  );
  const fromText = toFiniteNumber(textMatch?.[1] ?? null);
  if (fromText !== null && fromText >= 0) {
    return normalizeDividendPercent(fromText);
  }

  return null;
}

function extractDistributionYieldFromSummaryText(
  plainText: string,
  currentPrice: number | null,
): number | null {
  const recentDistributionMatch = plainText.match(
    /(?:直近分配金|分配金)[^0-9０-９]{0,20}([0-9０-９][0-9０-９,，]*(?:[\.．][0-9０-９]+)?)\s*(?:円|JPY)?/u
  );
  const settlementFrequencyMatch = plainText.match(
    /(?:決算頻度(?:\s*(?:（年）|\(年\)|年))?|年間決算回数)[^0-9０-９]{0,20}([0-9０-９][0-9０-９,，]*(?:[\.．][0-9０-９]+)?)\s*回/u
  );

  const recentDistribution = toFiniteNumber(recentDistributionMatch?.[1] ?? null);
  const settlementFrequency = toFiniteNumber(settlementFrequencyMatch?.[1] ?? null);
  return deriveDistributionYieldFromRecentDistribution(
    recentDistribution,
    settlementFrequency,
    currentPrice
  );
}

function deriveDistributionYieldFromRecentDistribution(
  recentDistribution: number | null,
  settlementFrequency: number | null,
  currentPrice: number | null,
): number | null {
  if (currentPrice === null || currentPrice <= 0) {
    return null;
  }

  if (recentDistribution === null || settlementFrequency === null) {
    return null;
  }

  if (recentDistribution < 0 || settlementFrequency <= 0) {
    return null;
  }

  const annualDistribution = recentDistribution * settlementFrequency;
  const distributionYield = annualDistribution / currentPrice;
  if (!Number.isFinite(distributionYield) || distributionYield < 0) {
    return null;
  }

  return distributionYield;
}

function extractCurrentPriceFromHtml(html: string, plainText: string): number | null {
  const fromJson = extractNumberByPatterns(html, [
    /"(?:standardPrice|basePrice|priceValue|regularMarketPrice|currentPrice)"\s*:\s*(?:"([0-9０-９,，]+(?:[\.．][0-9０-９]+)?(?:\s*(?:円|JPY))?)"|([0-9]+(?:\.[0-9]+)?))/,
    /"price"\s*:\s*\{\s*"raw"\s*:\s*([0-9]+(?:\.[0-9]+)?)/,
  ]);
  if (fromJson !== null) {
    return fromJson;
  }

  const textPattern =
    /(?:基準価額|現在値)\s*[:：]?\s*([0-9０-９][0-9０-９,，]*(?:[\.．][0-9０-９]+)?)\s*(?:円|JPY)?/u;
  const textPatternReverse =
    /([0-9０-９][0-9０-９,，]*(?:[\.．][0-9０-９]+)?)\s*(?:円|JPY)\s*(?:基準価額|現在値)/u;
  const fromText = toFiniteNumber(
    textPattern.exec(plainText)?.[1] ?? textPatternReverse.exec(plainText)?.[1] ?? null
  );
  return fromText;
}

function extractNumberByPatterns(html: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) {
      continue;
    }
    const raw = match[1] ?? match[2] ?? null;
    const value = toFiniteNumber(raw);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function normalizeDividendPercent(value: number): number {
  // Yahoo!ファイナンス日本版の shareDividendYield / distributionYield 系は
  // 「%値」で返るため、1%未満 (例: 0.59) も必ず 100 で割って比率へ変換する。
  return value / 100;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPreloadedState(html: string): YahooPreloadedState | null {
  const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
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
      .normalize("NFKC")
      .replace(/[,]/g, "")
      .replace(/[％%]/g, "")
      .replace(/[円¥]/g, "")
      .replace(/\s+/g, "")
      .trim();
    if (!normalized) return null;

    const direct = Number(normalized);
    if (Number.isFinite(direct)) {
      return direct;
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

function buildMemoryCacheKey(input: MarketDataInput): string {
  return `input:${marketDataInputKey(input)}`;
}

function getMutualFundSymbolOverride(name: string | undefined): string | null {
  const normalizedName = normalizeMutualFundLookupKey(name ?? "");
  if (!normalizedName) {
    return null;
  }
  return MUTUAL_FUND_SYMBOL_OVERRIDES_BY_NAME[normalizedName] ?? null;
}

function isPseudoMutualFundTicker(rawTicker: string): boolean {
  const raw = rawTicker.trim().toUpperCase();
  return raw.startsWith("FUND-") || raw.startsWith("SBI-") || raw.startsWith("EMAXIS-");
}

function isLikelyMutualFundCode(rawTicker: string): boolean {
  const normalized = rawTicker.trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  return /^\d{6,8}[A-Z]?$/.test(normalized);
}

function hasNonAscii(value: string): boolean {
  return /[^\u0020-\u007E]/u.test(value);
}

function normalizeExtractedYahooSymbol(rawSymbol: string | null | undefined): string | null {
  if (!rawSymbol) {
    return null;
  }

  let decoded = rawSymbol.trim();
  if (!decoded) {
    return null;
  }

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // decode失敗時は生値を利用
  }

  const stripped = decoded
    .replace(/^https?:\/\/finance\.yahoo\.co\.jp\/quote\//i, "")
    .split(/[/?#]/)[0]
    ?.trim();

  if (!stripped || /\s/u.test(stripped)) {
    return null;
  }

  return stripped.toUpperCase();
}

function normalizeMutualFundLookupKey(value: string): string {
  return value.normalize("NFKC").replace(/[　\s]/g, "").trim().toUpperCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logMarketDataDebug(scope: string, error: unknown): void {
  if (process.env.MARKET_DATA_DEBUG !== "1") {
    return;
  }
  console.error(`[market-data:${scope}]`, error);
}

async function getPersistedYahooSymbol(input: MarketDataInput): Promise<string | null> {
  try {
    const [{ getDb }, { marketSymbolCache: marketSymbolCacheTable }] = await Promise.all([
      import("@/infrastructure/database/connection"),
      import("@/infrastructure/database/schema"),
    ]);

    const db = getDb();
    const id = cacheKey(input);
    const rows = await db
      .select({
        yahooSymbol: marketSymbolCacheTable.yahooSymbol,
      })
      .from(marketSymbolCacheTable)
      .where(eq(marketSymbolCacheTable.id, id))
      .limit(1);

    const rawSymbol = rows[0]?.yahooSymbol;
    if (!rawSymbol) {
      return null;
    }

    const normalized = normalizeExtractedYahooSymbol(rawSymbol);
    return normalized;
  } catch (error) {
    logMarketDataDebug("getPersistedYahooSymbol", error);
    return null;
  }
}

async function savePersistedYahooSymbol(
  input: MarketDataInput,
  yahooSymbol: string,
): Promise<void> {
  try {
    const [{ getDb }, { marketSymbolCache: marketSymbolCacheTable }] = await Promise.all([
      import("@/infrastructure/database/connection"),
      import("@/infrastructure/database/schema"),
    ]);

    const db = getDb();
    const id = cacheKey(input);
    const normalized = normalizeExtractedYahooSymbol(yahooSymbol);
    if (!normalized) {
      return;
    }

    const nowIso = new Date().toISOString();

    await db
      .insert(marketSymbolCacheTable)
      .values({
        id,
        ticker: input.ticker,
        name: input.name ?? null,
        currency: input.currency,
        securityType: input.securityType,
        yahooSymbol: normalized,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: marketSymbolCacheTable.id,
        set: {
          name: input.name ?? null,
          yahooSymbol: normalized,
          resolvedAt: nowIso,
          updatedAt: nowIso,
        },
      });
  } catch (error) {
    logMarketDataDebug("savePersistedYahooSymbol", error);
    // 恒久キャッシュ保存失敗時は本処理を継続
  }
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
    const cachedCurrentPrice =
      typeof row.currentPrice === "number" && Number.isFinite(row.currentPrice)
        ? row.currentPrice
        : null;

    // 同日取得済み（失敗キャッシュ含む）
    if (!row.yahooSymbol) {
      // API専用モードは同日再試行しない
      // auto/scraping は API失敗時の救済のため再試行を許可
      if (mode === "api") {
        return { hit: true, data: null };
      }
      return { hit: false, data: null };
    }

    // 価格が空の旧キャッシュ行や、投資信託で1円誤検出された値は再取得を優先する
    const isClearlyInvalidMutualFundPrice =
      input.securityType === "mutualFund" && cachedCurrentPrice !== null && cachedCurrentPrice <= 1;
    if (cachedCurrentPrice == null || isClearlyInvalidMutualFundPrice) {
      return { hit: false, data: null };
    }

    return {
      hit: true,
      data: {
        sector: row.sector,
        dividendYield: row.dividendYield,
        currentPrice: cachedCurrentPrice,
        yahooSymbol: row.yahooSymbol,
        googleSymbol: row.googleSymbol,
      },
    };
  } catch (error) {
    logMarketDataDebug("getPersistedMarketDataForToday", error);
    return { hit: false, data: null };
  }
}

async function savePersistedMarketData(
  input: MarketDataInput,
  googleSymbol: string,
  todayJst: string,
  data: YahooMarketData | null,
  resolvedSymbol: string | null,
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
        yahooSymbol: data?.yahooSymbol ?? resolvedSymbol ?? null,
        googleSymbol,
        sector: data?.sector ?? null,
        dividendYield: data?.dividendYield ?? null,
        currentPrice: data?.currentPrice ?? null,
        fetchedDate: todayJst,
        fetchedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: marketDataCacheTable.id,
        set: {
          yahooSymbol: data?.yahooSymbol ?? resolvedSymbol ?? null,
          googleSymbol,
          sector: data?.sector ?? null,
          dividendYield: data?.dividendYield ?? null,
          currentPrice: data?.currentPrice ?? null,
          fetchedDate: todayJst,
          fetchedAt: new Date().toISOString(),
        },
      });
  } catch (error) {
    logMarketDataDebug("savePersistedMarketData", error);
    // キャッシュ保存失敗時は無視（本処理は継続）
  }
}
