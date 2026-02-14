// ============================================================
// Entity: Holding (保有証券)
// REQ-002: データ取得, REQ-018: 集約, REQ-019: 加重平均
// ============================================================

import {
  type HoldingId,
  type AccountId,
  type Entity,
  type Result,
  createHoldingId,
  ok,
  err,
} from "@/domain/types";
import type { Price } from "@/domain/value-objects/price";
import type { Security } from "@/domain/value-objects/security";
import type { Quantity } from "@/domain/value-objects/quantity";
import { v4 as uuidv4 } from "uuid";

export interface Holding extends Entity {
  readonly id: HoldingId;
  readonly accountId: AccountId;
  readonly security: Security;
  readonly quantity: Quantity;
  readonly averagePurchasePrice: Price;
  readonly currentPrice: Price;
  readonly recordedAt: Date;
}

export function createHolding(params: {
  accountId: AccountId;
  security: Security;
  quantity: Quantity;
  averagePurchasePrice: Price;
  currentPrice: Price;
}): Result<Holding> {
  if (params.security.currency !== params.averagePurchasePrice.currency) {
    return err(
      new Error("Security currency must match average purchase price currency")
    );
  }
  if (params.security.currency !== params.currentPrice.currency) {
    return err(
      new Error("Security currency must match current price currency")
    );
  }
  return ok({
    id: createHoldingId(uuidv4()),
    accountId: params.accountId,
    security: params.security,
    quantity: params.quantity,
    averagePurchasePrice: params.averagePurchasePrice,
    currentPrice: params.currentPrice,
    recordedAt: new Date(),
  });
}

// --- Computed Properties ---

export function holdingTotalCost(holding: Holding): number {
  return holding.quantity.value * holding.averagePurchasePrice.amount;
}

export function holdingCurrentValue(holding: Holding): number {
  return holding.quantity.value * holding.currentPrice.amount;
}

export function holdingGainLoss(holding: Holding): number {
  return holdingCurrentValue(holding) - holdingTotalCost(holding);
}

export function holdingGainLossPercent(holding: Holding): number {
  const cost = holdingTotalCost(holding);
  if (cost === 0) return 0;
  return (holdingGainLoss(holding) / cost) * 100;
}

// --- Aggregated Holding (REQ-018) ---

export interface AggregatedHolding {
  readonly security: Security;
  readonly totalQuantity: Quantity;
  readonly weightedAveragePrice: Price;
  readonly currentPrice: Price;
  readonly holdings: Holding[];
}

export function aggregatedTotalCost(agg: AggregatedHolding): number {
  return agg.totalQuantity.value * agg.weightedAveragePrice.amount;
}

export function aggregatedCurrentValue(agg: AggregatedHolding): number {
  return agg.totalQuantity.value * agg.currentPrice.amount;
}

export function aggregatedGainLoss(agg: AggregatedHolding): number {
  return aggregatedCurrentValue(agg) - aggregatedTotalCost(agg);
}

export function aggregatedGainLossPercent(agg: AggregatedHolding): number {
  const cost = aggregatedTotalCost(agg);
  if (cost === 0) return 0;
  return (aggregatedGainLoss(agg) / cost) * 100;
}
