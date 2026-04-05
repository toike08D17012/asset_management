// ============================================================
// Holdings Market Data Enrichment
// REQ-002: 市場価格反映, REQ-013: 履歴保存
// ============================================================

import {
  fetchYahooMarketDataBatch,
  getYahooMarketDataBatchFromCache,
  marketDataInputKey,
  normalizeYahooSymbol,
  toGoogleFinanceSymbol,
  type MarketDataInput,
} from "@/infrastructure/scraping/yahoo-finance-scraper";

export type MarketDataResponseMode = "cache" | "live";

export async function enrichHoldingsWithDataSource<T extends {
  security: { ticker: string; name?: string; currency: "JPY" | "USD"; type: "stock" | "mutualFund" };
  currentPrice: { amount: number; currency: "JPY" | "USD" };
}>(
  holdings: T[],
  mode: MarketDataResponseMode,
  forceRefresh: boolean,
  forceResolveSymbol: boolean,
): Promise<Array<T & {
  sector?: string | null;
  dividendYield?: number | null;
  yahooSymbol?: string;
  googleSymbol?: string;
}>> {
  const inputs: MarketDataInput[] = holdings.map((holding) => ({
    ticker: holding.security.ticker,
    name: holding.security.name,
    currency: holding.security.currency,
    securityType: holding.security.type,
  }));

  const marketDataMap =
    mode === "cache"
      ? await getYahooMarketDataBatchFromCache(inputs, { allowStale: true, todayOnly: false })
      : await fetchYahooMarketDataBatch(inputs, {
          minIntervalMs: 250,
          forceRefresh,
          forceResolveSymbol,
        });

  return holdings.map((holding) => {
    const input: MarketDataInput = {
      ticker: holding.security.ticker,
      name: holding.security.name,
      currency: holding.security.currency,
      securityType: holding.security.type,
    };
    const marketData = marketDataMap.get(marketDataInputKey(input)) ?? null;
    const normalizedYahooSymbol = normalizeYahooSymbol(input);

    return {
      ...holding,
      currentPrice:
        typeof marketData?.currentPrice === "number" && Number.isFinite(marketData.currentPrice)
          ? { ...holding.currentPrice, amount: marketData.currentPrice }
          : holding.currentPrice,
      sector: marketData?.sector ?? null,
      dividendYield: marketData?.dividendYield ?? null,
      yahooSymbol: marketData?.yahooSymbol ?? normalizedYahooSymbol ?? holding.security.ticker,
      googleSymbol: marketData?.googleSymbol ?? toGoogleFinanceSymbol(input),
    };
  });
}