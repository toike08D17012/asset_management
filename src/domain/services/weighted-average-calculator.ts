// ============================================================
// Domain Service: WeightedAveragePriceCalculator
// REQ-019: 加重平均による平均購入単価計算
// ============================================================

import { type Result, ok, err } from "@/domain/types";
import type { Holding } from "@/domain/entities/holding";
import type { Price } from "@/domain/value-objects/price";

/**
 * 同一銘柄の保有証券リストから加重平均購入単価を計算する
 * 加重平均 = Σ(数量 × 購入単価) / Σ(数量)
 */
export function calculateWeightedAveragePrice(
  holdings: Holding[]
): Result<Price> {
  if (holdings.length === 0) {
    return err(new Error("Cannot calculate weighted average for empty list"));
  }

  const currency = holdings[0].averagePurchasePrice.currency;

  // 通貨の一致を検証
  for (const holding of holdings) {
    if (holding.averagePurchasePrice.currency !== currency) {
      return err(
        new Error(
          "All holdings must have the same currency for weighted average calculation"
        )
      );
    }
  }

  let totalCost = 0;
  let totalQuantity = 0;

  // 投資信託の基準価額は1万口あたりのため、加重平均計算時も考慮
  const isMutualFund = holdings[0].security.type === "mutualFund";
  const divisor = isMutualFund ? 10000 : 1;

  for (const holding of holdings) {
    totalCost += (holding.quantity.value * holding.averagePurchasePrice.amount) / divisor;
    totalQuantity += holding.quantity.value;
  }

  if (totalQuantity === 0) {
    return err(new Error("Total quantity is zero"));
  }

  // 加重平均を元の単位（1万口あたり）に戻す
  return ok({
    amount: (totalCost / totalQuantity) * divisor,
    currency,
  });
}
