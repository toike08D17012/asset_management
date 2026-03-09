// ============================================================
// API: /api/snapshots - スナップショット比較
// REQ-013: 履歴保存, REQ-014: トレンドグラフ
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSnapshotRepository } from "@/lib/service-container";
import { withApiHandler } from "@/lib/api-handler";
import type { SnapshotHoldingComparison, SnapshotComparisonEntry } from "@/types/api";
import type { Snapshot } from "@/domain/entities/snapshot";
import type { Currency, SecurityType } from "@/domain/types";

function getDivisor(securityType: string): number {
  return securityType === "mutualFund" ? 10000 : 1;
}

function buildComparisonEntry(snapshot: Snapshot): SnapshotComparisonEntry {
  // Aggregate per (ticker:currency:securityType) across accounts
  const map = new Map<
    string,
    {
      ticker: string;
      currency: string;
      securityType: string;
      currentPrice: number;
      totalMarketValue: number;
      totalGainLoss: number;
    }
  >();

  for (const h of snapshot.holdings) {
    const key = `${h.ticker}:${h.currency}:${h.securityType}`;
    const divisor = getDivisor(h.securityType);
    const marketValue = (h.quantity * h.currentPrice) / divisor;
    const gainLoss = (h.quantity * (h.currentPrice - h.averagePurchasePrice)) / divisor;

    const existing = map.get(key);
    if (existing) {
      existing.totalMarketValue += marketValue;
      existing.totalGainLoss += gainLoss;
    } else {
      map.set(key, {
        ticker: h.ticker,
        currency: h.currency,
        securityType: h.securityType,
        currentPrice: h.currentPrice,
        totalMarketValue: marketValue,
        totalGainLoss: gainLoss,
      });
    }
  }

  const holdings: SnapshotHoldingComparison[] = Array.from(map.values()).map((v) => ({
    ticker: v.ticker,
    currency: v.currency as Currency,
    securityType: v.securityType as SecurityType,
    currentPrice: v.currentPrice,
    marketValue: v.totalMarketValue,
    gainLoss: v.totalGainLoss,
  }));

  return {
    date: snapshot.timestamp.toISOString().slice(0, 10),
    holdings,
  };
}

export const GET = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type !== "comparison") {
      return NextResponse.json({ error: "Invalid type parameter. Use ?type=comparison" }, { status: 400 });
    }

    const repoResult = getSnapshotRepository();
    if (!repoResult.ok) {
      return NextResponse.json({ error: repoResult.error.message }, { status: 500 });
    }

    const repo = repoResult.value;
    const now = new Date();

    // 前日: 過去7日以内の最新スナップショット（今日は除く）
    const prevDayEnd = new Date(now);
    prevDayEnd.setDate(prevDayEnd.getDate() - 1);
    prevDayEnd.setHours(23, 59, 59, 999);
    const prevDayStart = new Date(now);
    prevDayStart.setDate(prevDayStart.getDate() - 7);
    prevDayStart.setHours(0, 0, 0, 0);

    // 前月: 30日前を中心とした ±7日ウィンドウ内の最新スナップショット
    const prevMonthCenter = new Date(now);
    prevMonthCenter.setDate(prevMonthCenter.getDate() - 30);
    const prevMonthStart = new Date(prevMonthCenter);
    prevMonthStart.setDate(prevMonthStart.getDate() - 7);
    const prevMonthEnd = new Date(prevMonthCenter);
    prevMonthEnd.setDate(prevMonthEnd.getDate() + 7);

    const [prevDayResult, prevMonthResult] = await Promise.all([
      repo.findByPeriod(prevDayStart, prevDayEnd),
      repo.findByPeriod(prevMonthStart, prevMonthEnd),
    ]);

    // findByPeriod は降順ソートのため [0] が最新
    const prevDaySnapshot =
      prevDayResult.ok && prevDayResult.value.length > 0 ? prevDayResult.value[0] : null;
    const prevMonthSnapshot =
      prevMonthResult.ok && prevMonthResult.value.length > 0 ? prevMonthResult.value[0] : null;

    return NextResponse.json({
      previousDay: prevDaySnapshot ? buildComparisonEntry(prevDaySnapshot) : null,
      previousMonth: prevMonthSnapshot ? buildComparisonEntry(prevMonthSnapshot) : null,
    });
  }, "Failed to get snapshot comparison");
});
