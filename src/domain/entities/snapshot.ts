// ============================================================
// Entity: Snapshot (履歴スナップショット)
// REQ-013: 履歴保存, REQ-014: トレンドグラフ
// ============================================================

import {
  type SnapshotId,
  type Currency,
  type Entity,
  type Result,
  createSnapshotId,
  ok,
} from "@/domain/types";
import { v4 as uuidv4 } from "uuid";

export interface SnapshotHolding {
  readonly ticker: string;
  readonly name: string;
  readonly securityType: string;
  readonly currency: Currency;
  readonly quantity: number;
  readonly quantityUnit: string;
  readonly averagePurchasePrice: number;
  readonly currentPrice: number;
  readonly accountId: string;
}

export interface Snapshot extends Entity {
  readonly id: SnapshotId;
  readonly timestamp: Date;
  readonly totalValueJPY: number;
  readonly totalValueUSD: number;
  readonly holdings: SnapshotHolding[];
}

export function createSnapshot(params: {
  totalValueJPY: number;
  totalValueUSD: number;
  holdings: SnapshotHolding[];
}): Result<Snapshot> {
  return ok({
    id: createSnapshotId(uuidv4()),
    timestamp: new Date(),
    totalValueJPY: params.totalValueJPY,
    totalValueUSD: params.totalValueUSD,
    holdings: params.holdings,
  });
}
