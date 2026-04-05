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
// 新形式: 株式（特定預り）/ 旧形式: 株式（現物/特定預り）のどちらにも対応
// ※ ^で行頭アンカー: ファンド名内の「株式（」に誤マッチしないようにする
const STOCK_SECTION_PATTERN = /^株式（|^株式\(/;
const MUTUAL_FUND_SECTION_PATTERN = /^投資信託（|^投資信託\(/;
const SECTION_TOTAL_PATTERN = /合計/;
// 新形式: 銘柄コード（括弧なし）/ 旧形式: 銘柄（コード）のどちらにも対応
const HEADER_PATTERN_STOCK = /銘柄（コード）|銘柄\(コード\)|銘柄コード/;
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
      // 新旧フォーマット判定フラグ（ヘッダー行で検出）
      let stockIsNewFormat = false;
      let fundIsNewFormat = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        const firstCol = cols[0]?.trim().replace(/^"|"$/g, "") || "";

        // --- セクション合計行（先にチェック）→ データ行終了 ---
        // 「株式（特定預り）合計」のように合計を含む行を先に除外する
        if (SECTION_TOTAL_PATTERN.test(firstCol)) {
          inDataRows = false;
          continue;
        }

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

        // --- ヘッダー行検出 → フォーマット判定 + データ行開始 ---
        if (HEADER_PATTERN_STOCK.test(firstCol)) {
          // 新形式は第2列が「銘柄名称」、旧形式は「買付日」
          const secondColHeader = cols[1]?.trim().replace(/^"|"$/g, "") || "";
          stockIsNewFormat = secondColHeader === "銘柄名称";
          inDataRows = true;
          continue;
        }

        if (HEADER_PATTERN_FUND.test(firstCol)) {
          // 新形式は第2列が「保有口数」、旧形式は「買付日」
          const secondColHeader = cols[1]?.trim().replace(/^"|"$/g, "") || "";
          fundIsNewFormat = secondColHeader === "保有口数";
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
            ? this.parseStockRow(cols, stockIsNewFormat)
            : this.parseMutualFundRow(cols, fundIsNewFormat);

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
   * 新形式 (isNewFormat=true):
   *   col[0]=銘柄コード, col[1]=銘柄名称, col[2]=保有株数, col[3]=売却注文中,
   *   col[4]=取得単価, col[5]=現在値, col[6]=取得金額, col[7]=評価額, col[8]=評価損益
   * 旧形式 (isNewFormat=false):
   *   col[0]=銘柄（コード）+名称, col[1]=買付日, col[2]=数量, col[3]=取得単価, col[4]=現在値
   */
  private parseStockRow(cols: string[], isNewFormat: boolean): RawHolding | null {
    if (isNewFormat) {
      if (cols.length < 6) return null;
      const ticker = cols[0]?.trim().replace(/^"|"$/g, "") || "";
      const name = cols[1]?.trim().replace(/^"|"$/g, "") || "";
      const quantity = parseNumber(cols[2]);
      const avgPrice = parseNumber(cols[4]);
      const currentPrice = parseNumber(cols[5]);
      if (!ticker || quantity <= 0) return null;
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

    // 旧形式: "4502 武田薬" → ticker: "4502", name: "武田薬"
    if (cols.length < 5) return null;
    const rawTicker = cols[0]?.trim().replace(/^"|"$/g, "") || "";
    const quantity = parseNumber(cols[2]);
    const avgPrice = parseNumber(cols[3]);
    const currentPrice = parseNumber(cols[4]);
    if (!rawTicker || quantity <= 0) return null;
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
   * 新形式 (isNewFormat=true):
   *   col[0]=ファンド名, col[1]=保有口数(口付き), col[2]=売却注文中,
   *   col[3]=取得単価, col[4]=基準価額, col[5]=取得金額, col[6]=評価額, col[7]=評価損益
   * 旧形式 (isNewFormat=false):
   *   col[0]=ファンド名, col[1]=買付日, col[2]=数量(口), col[3]=取得単価, col[4]=現在値
   */
  private parseMutualFundRow(cols: string[], isNewFormat: boolean): RawHolding | null {
    if (cols.length < 5) return null;

    const fundName = cols[0]?.trim().replace(/^"|"$/g, "") || "";
    if (!fundName) return null;
    // 合計行や空行をスキップ
    if (SECTION_TOTAL_PATTERN.test(fundName)) return null;

    let quantity: number;
    let avgPrice: number;
    let currentPrice: number;

    if (isNewFormat) {
      // 保有口数は「247395口」形式なので「口」サフィックスを除去してパース
      const qtyRaw =
        cols[1]?.trim().replace(/^"|"$/g, "").replace(/口$/, "") || "0";
      quantity = parseNumber(qtyRaw);
      avgPrice = parseNumber(cols[3]);
      currentPrice = parseNumber(cols[4]);
    } else {
      quantity = parseNumber(cols[2]);
      avgPrice = parseNumber(cols[3]);
      currentPrice = parseNumber(cols[4]);
    }

    if (quantity <= 0) return null;

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
