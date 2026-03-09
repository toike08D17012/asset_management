// ============================================================
// Shared UI Types - API応答・表示用型定義
// コンポーネント間で共有する型を一元管理
// ============================================================

import type { SecurityType, Currency, QuantityUnit, Brokerage } from "@/domain/types";

// ---- Snapshot comparison types ----

/**
 * スナップショット比較用の銘柄データ（集約済み）
 */
export interface SnapshotHoldingComparison {
  readonly ticker: string;
  readonly currency: Currency;
  readonly securityType: SecurityType;
  readonly currentPrice: number;
  readonly marketValue: number;
  readonly gainLoss: number;
}

/**
 * 特定日時のスナップショット比較エントリ
 */
export interface SnapshotComparisonEntry {
  readonly date: string; // YYYY-MM-DD
  readonly holdings: SnapshotHoldingComparison[];
}

/**
 * 前日・前月との比較データ（/api/snapshots?type=comparison レスポンス）
 */
export interface SnapshotComparisonResponse {
  readonly previousDay: SnapshotComparisonEntry | null;
  readonly previousMonth: SnapshotComparisonEntry | null;
}

/**
 * 証券口座サマリー（API応答 + UI表示用）
 */
export interface AccountSummary {
  readonly id: string;
  readonly name: string;
  readonly brokerage: Brokerage;
  readonly createdAt: string;
  readonly lastSyncedAt: string | null;
}

/**
 * ポートフォリオサマリー（API応答用）
 */
export interface PortfolioData {
  readonly totalValueJPY: number;
  readonly totalValueUSD: number;
  readonly totalCostJPY: number;
  readonly totalCostUSD: number;
  readonly gainLossJPY: number;
  readonly gainLossUSD: number;
  readonly holdingsCount: number;
  readonly accountsCount: number;
}

/**
 * 保有証券データ（集約済み、API応答用）
 */
export interface HoldingData {
  readonly security: {
    readonly ticker: string;
    readonly name: string;
    readonly type: SecurityType;
    readonly currency: Currency;
  };
  readonly sector?: string | null;
  readonly dividendYield?: number | null; // 0.035 = 3.5%
  readonly yahooSymbol?: string;
  readonly googleSymbol?: string;
  readonly totalQuantity?: { readonly value: number; readonly unit: QuantityUnit };
  readonly quantity?: { readonly value: number; readonly unit: QuantityUnit };
  readonly weightedAveragePrice?: { readonly amount: number; readonly currency: Currency };
  readonly averagePurchasePrice?: { readonly amount: number; readonly currency: Currency };
  readonly currentPrice: { readonly amount: number; readonly currency: Currency };
  readonly holdings?: unknown[];
}
