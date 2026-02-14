// ============================================================
// Brokerage Adapter Interface + Types
// REQ-009, REQ-017: CSV/HTMLエクスポート経由取得
// Strategy Pattern (ADR-0002)
// ============================================================

import type { Result } from "@/domain/types";
import type { Brokerage, Currency, SecurityType, QuantityUnit } from "@/domain/types";

export interface RawHolding {
  readonly ticker: string;
  readonly name: string;
  readonly securityType: SecurityType;
  readonly currency: Currency;
  readonly quantity: number;
  readonly quantityUnit: QuantityUnit;
  readonly averagePurchasePrice: number;
  readonly currentPrice: number;
}

export interface IBrokerageAdapter {
  readonly brokerage: Brokerage;
  readonly displayName: string;

  /**
   * CSVデータから保有証券を解析する
   */
  parseCSV(csvContent: string): Result<RawHolding[]>;

  /**
   * サポートするCSVフォーマットの説明を返す
   */
  getCSVFormatDescription(): string;
}
