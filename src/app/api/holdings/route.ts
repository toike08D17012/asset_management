// ============================================================
// API: /api/holdings - 保有証券一覧 & 集約
// REQ-001, REQ-003, REQ-018
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getHoldingsService } from "@/lib/service-container";
import { getSnapshotRepository } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { Currency, QuantityUnit, SecurityType } from "@/domain/types";
import { parseJsonObject, readEnumField, readStringField } from "@/lib/request-validation";
import {
  fetchYahooMarketData,
} from "@/infrastructure/scraping/yahoo-finance-scraper";
import { persistSnapshotForAggregatedHoldings, type SnapshotSourceHolding } from "./snapshot-persistence";
import { enrichHoldingsWithDataSource, type MarketDataResponseMode } from "@/infrastructure/market-data/enrich-holdings";

export const GET = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const { searchParams } = new URL(request.url);
    const aggregate = searchParams.get("aggregate") === "true";
    const accountId = searchParams.get("accountId");
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    const forceResolveSymbol = searchParams.get("forceResolveSymbol") === "true";
    const marketDataMode: MarketDataResponseMode =
      searchParams.get("marketData") === "live" ? "live" : "cache";

    if (aggregate) {
      const result = await serviceResult.value.aggregateHoldings();
      if (!result.ok) return resultToResponse(result);
      const holdings = await enrichHoldingsWithDataSource(
        result.value,
        marketDataMode,
        forceRefresh,
        forceResolveSymbol,
      );

      if (marketDataMode === "live") {
        const snapshotRepoResult = getSnapshotRepository();
        if (!snapshotRepoResult.ok) {
          console.error("Failed to get snapshot repository:", snapshotRepoResult.error.message);
        } else {
          const persistResult = await persistSnapshotForAggregatedHoldings(
            snapshotRepoResult.value,
            holdings as SnapshotSourceHolding[]
          );

          if (!persistResult.ok) {
            console.error("Failed to persist holdings snapshot:", persistResult.error.message);
          }
        }
      }

      return NextResponse.json({ holdings, aggregated: true });
    }

    if (accountId) {
      const result =
        await serviceResult.value.getHoldingsByAccount(accountId);
      if (!result.ok) return resultToResponse(result);
      const holdings = await enrichHoldingsWithDataSource(
        result.value,
        marketDataMode,
        forceRefresh,
        forceResolveSymbol,
      );
      return NextResponse.json({ holdings });
    }

    const result = await serviceResult.value.getAllHoldings();
    if (!result.ok) return resultToResponse(result);

    const holdings = await enrichHoldingsWithDataSource(
      result.value,
      marketDataMode,
      forceRefresh,
      forceResolveSymbol,
    );
    return NextResponse.json({ holdings });
  }, "Failed to get holdings");
});

function readNumberField(
  body: Record<string, unknown>,
  field: string,
  options: { required?: boolean; min?: number; label?: string },
): { ok: true; value: number | null } | { ok: false; response: NextResponse } {
  const required = options.required ?? false;
  const min = options.min;
  const label = options.label ?? field;
  const raw = body[field];

  if (raw === undefined || raw === null || raw === "") {
    if (required) {
      return {
        ok: false,
        response: NextResponse.json({ error: `${label}は必須です` }, { status: 400 }),
      };
    }
    return { ok: true, value: null };
  }

  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${label}は数値で指定してください` }, { status: 400 }),
    };
  }

  if (typeof min === "number" && value < min) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${label}は${min}以上で入力してください` },
        { status: 400 },
      ),
    };
  }

  return { ok: true, value };
}

export const POST = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const bodyResult = await parseJsonObject(request, { maxChars: 64_000 });
    if (!bodyResult.ok) return bodyResult.response;

    const accountIdResult = readStringField(bodyResult.data, "accountId", {
      required: true,
      minLength: 1,
      maxLength: 128,
      label: "口座ID",
    });
    if (!accountIdResult.ok) return accountIdResult.response;

    const tickerResult = readStringField(bodyResult.data, "ticker", {
      required: true,
      minLength: 1,
      maxLength: 64,
      label: "銘柄コード",
    });
    if (!tickerResult.ok) return tickerResult.response;

    const nameResult = readStringField(bodyResult.data, "name", {
      required: true,
      minLength: 1,
      maxLength: 256,
      label: "銘柄名",
    });
    if (!nameResult.ok) return nameResult.response;

    const securityTypeResult = readEnumField(
      bodyResult.data,
      "securityType",
      [SecurityType.STOCK, SecurityType.MUTUAL_FUND] as const,
      { required: true, label: "銘柄種別" },
    );
    if (!securityTypeResult.ok) return securityTypeResult.response;

    const currencyResult = readEnumField(
      bodyResult.data,
      "currency",
      [Currency.JPY, Currency.USD] as const,
      { required: true, label: "通貨" },
    );
    if (!currencyResult.ok) return currencyResult.response;

    const quantityUnitResult = readEnumField(
      bodyResult.data,
      "quantityUnit",
      [QuantityUnit.SHARES, QuantityUnit.UNITS] as const,
      { required: true, label: "数量単位" },
    );
    if (!quantityUnitResult.ok) return quantityUnitResult.response;

    const quantityResult = readNumberField(bodyResult.data, "quantity", {
      required: true,
      min: 0.0000001,
      label: "数量",
    });
    if (!quantityResult.ok) return quantityResult.response;

    const currentPriceResult = readNumberField(bodyResult.data, "currentPrice", {
      required: false,
      min: 0,
      label: "現在値",
    });
    if (!currentPriceResult.ok) return currentPriceResult.response;

    const averagePurchasePriceResult = readNumberField(bodyResult.data, "averagePurchasePrice", {
      required: false,
      min: 0,
      label: "平均取得価格",
    });
    if (!averagePurchasePriceResult.ok) return averagePurchasePriceResult.response;

    const marketData = await fetchYahooMarketData(
      {
        ticker: tickerResult.value!,
        name: nameResult.value!,
        currency: currencyResult.value!,
        securityType: securityTypeResult.value!,
      },
      { forceRefresh: false },
    );

    const resolvedCurrentPrice =
      currentPriceResult.value ??
      (typeof marketData?.currentPrice === "number" ? marketData.currentPrice : null) ??
      averagePurchasePriceResult.value;

    if (resolvedCurrentPrice === null) {
      return NextResponse.json(
        {
          error:
            "現在値を自動取得できませんでした。平均取得価格を入力するか、現在値を手動で入力してください。",
        },
        { status: 400 },
      );
    }

    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.addManualHolding({
      accountId: accountIdResult.value!,
      ticker: tickerResult.value!,
      name: nameResult.value!,
      securityType: securityTypeResult.value!,
      currency: currencyResult.value!,
      quantity: quantityResult.value!,
      quantityUnit: quantityUnitResult.value!,
      currentPrice: resolvedCurrentPrice,
      averagePurchasePrice: averagePurchasePriceResult.value,
    });

    return resultToResponse(result, { wrapKey: "holding", status: 201 });
  }, "Failed to create holding");
});
