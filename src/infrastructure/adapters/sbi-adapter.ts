// ============================================================
// SBI Securities Adapter
// REQ-009: SBI証券対応
// SBI証券ポートフォリオCSVエクスポートの実フォーマットに対応
// ============================================================

import {
  Brokerage,
  Currency,
  SecurityType,
  QuantityUnit,
  type Result,
  ok,
  err,
} from "@/domain/types";
import type { IBrokerageAdapter, RawHolding } from "./brokerage-adapter";
import { parseCSVLine, parseNumber, stripBOM } from "./csv-utils";

// SBI証券CSVのセクション種別
type SBISectionType = "stock" | "mutualFund" | "unknown";

// セクション検出用のパターン
const STOCK_SECTION_PATTERN = /株式（現物|株式\(現物/;
const MUTUAL_FUND_SECTION_PATTERN = /投資信託（|投資信託\(/;
const SECTION_TOTAL_PATTERN = /合計/;
const HEADER_PATTERN_STOCK = /銘柄（コード）|銘柄\(コード\)/;
const HEADER_PATTERN_FUND = /ファンド名/;
const SUMMARY_PATTERNS = ["総合計", "評価額", "含み損益"];

export class SBIBrokerageAdapter implements IBrokerageAdapter {
  readonly brokerage = Brokerage.SBI;
  readonly displayName = "SBI証券";

  parseCSV(csvContent: string): Result<RawHolding[]> {
    try {
      const content = stripBOM(csvContent);
      const lines = content.trim().split("\n");

      if (lines.length < 2) {
        return err(new Error("CSVデータが不足しています"));
      }

      const holdings: RawHolding[] = [];
      let currentSection: SBISectionType = "unknown";
      let inDataRows = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        const firstCol = cols[0]?.trim().replace(/^"|"$/g, "") || "";

        // --- セクション検出 ---
        if (STOCK_SECTION_PATTERN.test(firstCol)) {
          currentSection = "stock";
          inDataRows = false;
          continue;
        }

        if (MUTUAL_FUND_SECTION_PATTERN.test(firstCol)) {
          currentSection = "mutualFund";
          inDataRows = false;
          continue;
        }

        // --- セクション合計行 → データ行終了 ---
        if (SECTION_TOTAL_PATTERN.test(firstCol)) {
          inDataRows = false;
          continue;
        }

        // --- ヘッダー行検出 → 次の行からデータ ---
        if (
          HEADER_PATTERN_STOCK.test(firstCol) ||
          HEADER_PATTERN_FUND.test(firstCol)
        ) {
          inDataRows = true;
          continue;
        }

        // --- サマリー行 / メタデータ行のスキップ ---
        if (this.isMetadataLine(firstCol)) {
          continue;
        }

        // --- データ行の処理 ---
        if (!inDataRows || currentSection === "unknown") continue;

        const holding =
          currentSection === "stock"
            ? this.parseStockRow(cols)
            : this.parseMutualFundRow(cols);

        if (holding) {
          holdings.push(holding);
        }
      }

      if (holdings.length === 0) {
        return err(
          new Error(
            "SBI証券CSVから保有証券を検出できませんでした。ポートフォリオ一覧CSVをご利用ください。"
          )
        );
      }

      return ok(holdings);
    } catch (error) {
      return err(
        new Error(
          `SBI証券CSVの解析に失敗: ${error instanceof Error ? error.message : "Unknown"}`
        )
      );
    }
  }

  /**
   * 株式データ行をパースする
   * CSVカラム: 銘柄（コード）, 買付日, 数量, 取得単価, 現在値, 前日比, 前日比(%), 損益, 損益(%), 評価額
   */
  private parseStockRow(cols: string[]): RawHolding | null {
    if (cols.length < 5) return null;

    const rawTicker = cols[0]?.trim().replace(/^"|"$/g, "") || "";
    const quantity = parseNumber(cols[2]);
    const avgPrice = parseNumber(cols[3]);
    const currentPrice = parseNumber(cols[4]);

    if (!rawTicker || quantity <= 0) return null;

    // "4502 武田薬" → ticker: "4502", name: "武田薬"
    const { ticker, name } = this.parseStockTickerName(rawTicker);
    if (!ticker) return null;

    return {
      ticker,
      name,
      securityType: SecurityType.STOCK,
      currency: Currency.JPY,
      quantity,
      quantityUnit: QuantityUnit.SHARES,
      averagePurchasePrice: avgPrice,
      currentPrice,
    };
  }

  /**
   * 投資信託データ行をパースする
   * CSVカラム: ファンド名, 買付日, 数量(口), 取得単価, 現在値, 前日比, 前日比(%), 損益, 損益(%), 評価額
   */
  private parseMutualFundRow(cols: string[]): RawHolding | null {
    if (cols.length < 5) return null;

    const fundName = cols[0]?.trim().replace(/^"|"$/g, "") || "";
    const quantity = parseNumber(cols[2]);
    const avgPrice = parseNumber(cols[3]);
    const currentPrice = parseNumber(cols[4]);

    if (!fundName || quantity <= 0) return null;
    // 合計行や空行をスキップ
    if (SECTION_TOTAL_PATTERN.test(fundName)) return null;

    // ファンド名からティッカーを生成（SBI証券の投信にはティッカーがないため）
    const ticker = this.generateFundTicker(fundName);

    return {
      ticker,
      name: fundName,
      securityType: SecurityType.MUTUAL_FUND,
      currency: Currency.JPY,
      quantity,
      quantityUnit: QuantityUnit.UNITS,
      averagePurchasePrice: avgPrice,
      currentPrice,
    };
  }

  /**
   * 株式の「コード 銘柄名」を分離する
   * 例: "4502 武田薬" → { ticker: "4502", name: "武田薬" }
   */
  private parseStockTickerName(raw: string): {
    ticker: string;
    name: string;
  } {
    const match = raw.match(/^(\d{4,5})\s+(.+)$/);
    if (match) {
      return { ticker: match[1], name: match[2].trim() };
    }
    // スペースなしの場合: "4502武田薬"
    const match2 = raw.match(/^(\d{4,5})(.+)$/);
    if (match2) {
      return { ticker: match2[1], name: match2[2].trim() };
    }
    return { ticker: "", name: raw };
  }

  /**
   * ファンド名からティッカーIDを生成する
   * SBI証券の投信にはティッカーコードがないため、
   * ファンド名から一意のキーを作成する
   */
  private generateFundTicker(fundName: string): string {
    // 代表的なファンド名のマッピング
    const knownFunds: Record<string, string> = {
      "ＳＢＩ日本高配当株式（分配）ファンド（年４回決算型）": "SBI-JPN-DIV",
      "ＳＢＩ・Ｖ・米国高配当株式インデックス・ファンド（年４回決算型）": "SBI-V-US-DIV",
      "ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）": "SBI-EU-DIV",
      "ｅＭＡＸＩＳ　Ｓｌｉｍ　全世界株式（オール・カントリー）": "EMAXIS-ALL-COUNTRY",
    };

    // 既知のファンドがあればそのティッカーを使う
    if (knownFunds[fundName]) {
      return knownFunds[fundName];
    }

    // 未知のファンドの場合はファンド名を短縮してティッカーを生成
    const normalized = fundName
      .replace(/[（(].+?[）)]/g, "")
      .replace(/[・　\s]/g, "")
      .slice(0, 20);
    return `FUND-${normalized}`;
  }

  /**
   * メタデータ行（スキップ対象）かどうかを判定する
   */
  private isMetadataLine(firstCol: string): boolean {
    const metadataPatterns = [
      "ポートフォリオ一覧",
      "一括表示",
      "PTS株価",
      "総件数",
      "選択範囲",
      "ページ",
      "総合計",
    ];
    return metadataPatterns.some((p) => firstCol.includes(p));
  }

  getCSVFormatDescription(): string {
    return "SBI証券のポートフォリオ一覧CSVエクスポート（株式・投資信託の複数セクションを含む形式）";
  }
}
