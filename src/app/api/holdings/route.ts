// ============================================================
// API: /api/holdings - 保有証券一覧 & 集約
// REQ-001, REQ-003, REQ-018
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getHoldingsService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import {
  fetchYahooMarketDataBatch,
  getYahooMarketDataBatchFromCache,
  marketDataInputKey,
  toGoogleFinanceSymbol,
  type MarketDataInput,
} from "@/infrastructure/scraping/yahoo-finance-scraper";

type MarketDataResponseMode = "cache" | "live";

async function enrichHoldingsWithMarketData<T extends {
  security: { ticker: string; currency: "JPY" | "USD"; type: "stock" | "mutualFund" };
  currentPrice: { amount: number; currency: "JPY" | "USD" };
}>(holdings: T[]): Promise<Array<T & {
  sector?: string | null;
  dividendYield?: number | null;
  yahooSymbol?: string;
  googleSymbol?: string;
}>> {
  return enrichHoldingsWithDataSource(holdings, "live", false);
}

async function enrichHoldingsWithDataSource<T extends {
  security: { ticker: string; currency: "JPY" | "USD"; type: "stock" | "mutualFund" };
  currentPrice: { amount: number; currency: "JPY" | "USD" };
}>(
  holdings: T[],
  mode: MarketDataResponseMode,
  forceRefresh: boolean,
): Promise<Array<T & {
  sector?: string | null;
  dividendYield?: number | null;
  yahooSymbol?: string;
  googleSymbol?: string;
}>> {
  const inputs: MarketDataInput[] = holdings.map((holding) => ({
    ticker: holding.security.ticker,
    currency: holding.security.currency,
    securityType: holding.security.type,
  }));

  const marketDataMap =
    mode === "cache"
      ? await getYahooMarketDataBatchFromCache(inputs, { allowStale: true, todayOnly: false })
      : await fetchYahooMarketDataBatch(inputs, {
          minIntervalMs: 250,
          forceRefresh,
        });

  const enriched = holdings.map((holding) => {
    const input: MarketDataInput = {
      ticker: holding.security.ticker,
      currency: holding.security.currency,
      securityType: holding.security.type,
    };
    const marketData = marketDataMap.get(marketDataInputKey(input)) ?? null;

    return {
      ...holding,
      currentPrice:
        typeof marketData?.currentPrice === "number" && Number.isFinite(marketData.currentPrice)
          ? { ...holding.currentPrice, amount: marketData.currentPrice }
          : holding.currentPrice,
      sector: marketData?.sector ?? null,
      dividendYield: marketData?.dividendYield ?? null,
      yahooSymbol: marketData?.yahooSymbol ?? holding.security.ticker,
      googleSymbol: marketData?.googleSymbol ?? toGoogleFinanceSymbol(input),
    };
  });

  return enriched;
}

export const GET = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const { searchParams } = new URL(request.url);
    const aggregate = searchParams.get("aggregate") === "true";
    const accountId = searchParams.get("accountId");
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    const marketDataMode: MarketDataResponseMode =
      searchParams.get("marketData") === "live" ? "live" : "cache";

    if (aggregate) {
      const result = await serviceResult.value.aggregateHoldings();
      if (!result.ok) return resultToResponse(result);
      const holdings = await enrichHoldingsWithDataSource(result.value, marketDataMode, forceRefresh);
      return NextResponse.json({ holdings, aggregated: true });
    }

    if (accountId) {
      const result =
        await serviceResult.value.getHoldingsByAccount(accountId);
      if (!result.ok) return resultToResponse(result);
      const holdings = await enrichHoldingsWithDataSource(result.value, marketDataMode, forceRefresh);
      return NextResponse.json({ holdings });
    }

    const result = await serviceResult.value.getAllHoldings();
    if (!result.ok) return resultToResponse(result);

    const holdings = await enrichHoldingsWithDataSource(result.value, marketDataMode, forceRefresh);
    return NextResponse.json({ holdings });
  }, "Failed to get holdings");
});
