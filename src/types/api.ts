// ============================================================
// Shared UI Types - API応答・表示用型定義
// コンポーネント間で共有する型を一元管理
// ============================================================

import type { SecurityType, Currency, QuantityUnit } from "@/domain/types";

/**
 * 証券口座サマリー（API応答 + UI表示用）
 */
export interface AccountSummary {
  readonly id: string;
  readonly name: string;
  readonly brokerage: string;
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
