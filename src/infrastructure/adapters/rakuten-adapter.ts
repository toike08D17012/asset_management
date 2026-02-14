// ============================================================
// Rakuten Securities Adapter
// REQ-009: 楽天証券対応
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

export class RakutenBrokerageAdapter implements IBrokerageAdapter {
  readonly brokerage = Brokerage.RAKUTEN;
  readonly displayName = "楽天証券";

  parseCSV(csvContent: string): Result<RawHolding[]> {
    try {
      const content = stripBOM(csvContent);
      
      const lines = content.trim().split("\n");
      if (lines.length < 2) {
        return err(new Error("CSVデータが不足しています"));
      }

      const holdings: RawHolding[] = [];
      
      // 楽天証券CSVは複数セクションに分かれている
      // "■ 保有商品詳細 (すべて）" セクションを探す
      let inHoldingsSection = false;
      let headerLineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 保有商品詳細セクションの開始を検出
        if (line.includes("保有商品詳細")) {
          inHoldingsSection = true;
          continue;
        }
        
        // セクション内でヘッダー行を検出（"種別"で始まる行）
        if (inHoldingsSection && line.startsWith('"種別"')) {
          headerLineIndex = i;
          continue;
        }
        
        // ヘッダー行の次の行からデータ行として処理
        if (headerLineIndex !== -1 && i > headerLineIndex) {
          // 空行 or 次のセクション（■参考為替レート）で終了
          if (!line || line.startsWith('"■')) {
            break;
          }
          
          const cols = parseCSVLine(line);
          if (cols.length < 10) continue;
          
          // 楽天証券CSVの実際のカラム:
          // [0]種別, [1]銘柄コード・ティッカー, [2]銘柄, [3]口座,
          // [4]保有数量, [5]［単位］, [6]平均取得価額, [7]［単位］,
          // [8]現在値, [9]［単位］, [10]現在値(更新日), [11](参考為替),
          // [12]前日比, [13]［単位］, [14]時価評価額[円], [15]時価評価額[外貨],
          // [16]評価損益[円], [17]評価損益[％]
          const category = cols[0]?.trim() || "";
          const ticker = cols[1]?.trim() || "";
          const name = cols[2]?.trim() || "";
          const quantityStr = cols[4]?.trim() || "0";
          const avgPriceStr = cols[6]?.trim() || "0";
          const currentPriceStr = cols[8]?.trim() || "0";
          
          // 外貨預り金はスキップ
          if (category.includes("外貨預り金") || category.includes("預り金")) continue;
          // 銘柄名がないものはスキップ
          if (!name) continue;
          
          const quantity = parseNumber(quantityStr);
          const avgPrice = parseNumber(avgPriceStr);
          const currentPrice = parseNumber(currentPriceStr);
          
          if (quantity <= 0) continue;
          
          // 分類から証券種別を判定
          const securityType = category.includes("投信") || category.includes("投資信託")
            ? SecurityType.MUTUAL_FUND
            : SecurityType.STOCK;
          
          // 通貨判定（米国株式なら USD、それ以外は JPY）
          const currency = category.includes("米国") || category.includes("外国")
            ? Currency.USD
            : Currency.JPY;
          
          const quantityUnit = securityType === SecurityType.MUTUAL_FUND
            ? QuantityUnit.UNITS
            : QuantityUnit.SHARES;

          // 投資信託はティッカーが空なので銘柄名をティッカー代わりに使う
          const effectiveTicker = ticker || name;

          holdings.push({
            ticker: effectiveTicker,
            name,
            securityType,
            currency,
            quantity,
            quantityUnit,
            averagePurchasePrice: avgPrice,
            currentPrice,
          });
        }
      }

      if (holdings.length === 0) {
        return err(new Error("保有商品データが見つかりませんでした。CSVフォーマットを確認してください。"));
      }

      return ok(holdings);
    } catch (error) {
      return err(
        new Error(
          `楽天証券CSVの解析に失敗: ${error instanceof Error ? error.message : "Unknown"}`
        )
      );
    }
  }

  getCSVFormatDescription(): string {
    return "楽天証券の「資産残高（合計）」CSVファイルをそのままアップロードしてください";
  }

}
