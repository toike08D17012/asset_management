// ============================================================
// Snapshot Persistence Helper
// REQ-013: 履歴保存, REQ-014: トレンドグラフ
// ============================================================

import type { ISnapshotRepository } from "@/domain/repositories";
import type { AggregatedHolding } from "@/domain/entities/holding";
import { createSnapshot } from "@/domain/entities/snapshot";
import { type Result, ok, err } from "@/domain/types";
import { getMutualFundDivisor } from "@/lib/format";

export type SnapshotSourceHolding = AggregatedHolding & {
  readonly sector?: string | null;
  readonly dividendYield?: number | null;
  readonly yahooSymbol?: string;
  readonly googleSymbol?: string;
};

export function createSnapshotFromAggregatedHoldings(
  holdings: SnapshotSourceHolding[]
) {
  let totalValueJPY = 0;
  let totalValueUSD = 0;

  const snapshotHoldings = holdings.flatMap((holding) => {
    const divisor = getMutualFundDivisor(holding.security.type);
    const marketValue = (holding.totalQuantity.value * holding.currentPrice.amount) / divisor;

    if (holding.security.currency === "JPY") {
      totalValueJPY += marketValue;
    } else {
      totalValueUSD += marketValue;
    }

    return holding.holdings.map((item) => ({
      ticker: item.security.ticker,
      name: item.security.name,
      securityType: item.security.type,
      currency: item.security.currency,
      quantity: item.quantity.value,
      quantityUnit: item.quantity.unit,
      averagePurchasePrice: item.averagePurchasePrice.amount,
      currentPrice: holding.currentPrice.amount,
      accountId: item.accountId,
    }));
  });

  return createSnapshot({
    totalValueJPY,
    totalValueUSD,
    holdings: snapshotHoldings,
  });
}

export async function persistSnapshotForAggregatedHoldings(
  snapshotRepository: ISnapshotRepository,
  holdings: SnapshotSourceHolding[]
): Promise<Result<void>> {
  const snapshotResult = createSnapshotFromAggregatedHoldings(holdings);
  if (!snapshotResult.ok) {
    return err(snapshotResult.error);
  }

  const saveResult = await snapshotRepository.save(snapshotResult.value);
  if (!saveResult.ok) {
    return err(saveResult.error);
  }

  return ok(undefined);
}