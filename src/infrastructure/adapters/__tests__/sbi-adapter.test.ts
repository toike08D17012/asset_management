// ============================================================
// SBI Adapter Tests
// SBI証券ポートフォリオCSVの実フォーマットパーサーテスト
// ============================================================

import { describe, it, expect } from "vitest";
import { SBIBrokerageAdapter } from "../sbi-adapter";
import { SecurityType, QuantityUnit, Currency } from "@/domain/types";

const sbiAdapter = new SBIBrokerageAdapter();

// 実際のSBI証券CSVエクスポート形式のテストデータ
const SAMPLE_SBI_CSV = `"ポートフォリオ一覧",
"一括表示",
"PTS株価非表示",
"総件数：7件",
"選択範囲：1-7件",
"ページ：1",
"株式（現物/特定預り）",
"銘柄（コード）","買付日","数量","取得単価","現在値","前日比","前日比（％）","損益","損益（％）","評価額",
"4502 武田薬","2023/02/27",20,4199,5614,+5,+0.09,+28300,+33.70,112280,
"5401 日本製鉄","----/--/--",125,627,648,-50,-7.16,+2625,+3.35,81000,
"2914 ＪＴ","2023/03/07",30,2766,6087,-53,-0.86,+99630,+120.07,182610,
"株式(現物/特定預り)合計",
"評価額","含み損益","含み損益（％）","前日比","前日比（％）",
375890,+130555,+53.21,-7740,-2.02,
"投資信託（金額/NISA預り（成長投資枠））",
"ファンド名","買付日","数量","取得単価","現在値","前日比","前日比（％）","損益","損益（％）","評価額",
"ＳＢＩ日本高配当株式（分配）ファンド（年４回決算型）","----/--/--",225183,12153,16610,+149,+0.91,+100364.06,+36.67,374028.96,
"ＳＢＩ・Ｖ・米国高配当株式インデックス・ファンド（年４回決算型）","----/--/--",222713,11955,14333,-193,-1.33,+52961.15,+19.89,319214.54,
"ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）","----/--/--",65153,10063,13682,-221,-1.59,+23578.87,+35.96,89142.33,
"投資信託(金額/NISA預り(成長投資枠))合計",
"評価額","含み損益","含み損益（％）","前日比","前日比（％）",
782385.84,+176904.08,+29.22,-2383.02,-0.30,
"投資信託（金額/NISA預り（つみたて投資枠））",
"ファンド名","買付日","数量","取得単価","現在値","前日比","前日比（％）","損益","損益（％）","評価額",
"ｅＭＡＸＩＳ　Ｓｌｉｍ　全世界株式（オール・カントリー）","----/--/--",319895,26259,33857,-572,-1.66,+243056.22,+28.93,1083068.5,
"投資信託(金額/NISA預り(つみたて投資枠))合計",
"評価額","含み損益","含み損益（％）","前日比","前日比（％）",
1083068.5,+243056.22,+28.93,-18297.99,-1.66,
"総合計",
"評価額","含み損益","含み損益（％）","前日比","前日比（％）",
2241344.34,+550515.3,+32.56,-28421.01,-1.25`;

describe("SBIBrokerageAdapter", () => {
  it("実際のSBI証券CSVから全銘柄を正しくパースできる", () => {
    const result = sbiAdapter.parseCSV(SAMPLE_SBI_CSV);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 株式3 + 投資信託4 = 7件
    expect(result.value).toHaveLength(7);
  });

  it("株式セクションを正しくパースできる", () => {
    const result = sbiAdapter.parseCSV(SAMPLE_SBI_CSV);
    if (!result.ok) return;

    const stocks = result.value.filter(
      (h) => h.securityType === SecurityType.STOCK
    );
    expect(stocks).toHaveLength(3);

    // 武田薬品
    const takeda = stocks.find((s) => s.ticker === "4502");
    expect(takeda).toBeDefined();
    expect(takeda!.name).toBe("武田薬");
    expect(takeda!.quantity).toBe(20);
    expect(takeda!.averagePurchasePrice).toBe(4199);
    expect(takeda!.currentPrice).toBe(5614);
    expect(takeda!.currency).toBe(Currency.JPY);
    expect(takeda!.quantityUnit).toBe(QuantityUnit.SHARES);

    // 日本製鉄
    const nipponSteel = stocks.find((s) => s.ticker === "5401");
    expect(nipponSteel).toBeDefined();
    expect(nipponSteel!.quantity).toBe(125);
    expect(nipponSteel!.averagePurchasePrice).toBe(627);
    expect(nipponSteel!.currentPrice).toBe(648);

    // JT
    const jt = stocks.find((s) => s.ticker === "2914");
    expect(jt).toBeDefined();
    expect(jt!.name).toBe("ＪＴ");
    expect(jt!.quantity).toBe(30);
  });

  it("投資信託セクション（NISA成長投資枠）を正しくパースできる", () => {
    const result = sbiAdapter.parseCSV(SAMPLE_SBI_CSV);
    if (!result.ok) return;

    const funds = result.value.filter(
      (h) => h.securityType === SecurityType.MUTUAL_FUND
    );
    expect(funds).toHaveLength(4);

    // SBI日本高配当
    const jpnDiv = funds.find((f) => f.ticker === "SBI-JPN-DIV");
    expect(jpnDiv).toBeDefined();
    expect(jpnDiv!.quantity).toBe(225183);
    expect(jpnDiv!.averagePurchasePrice).toBe(12153);
    expect(jpnDiv!.currentPrice).toBe(16610);
    expect(jpnDiv!.quantityUnit).toBe(QuantityUnit.UNITS);

    // eMAXIS Slim 全世界株式
    const allCountry = funds.find(
      (f) => f.ticker === "EMAXIS-ALL-COUNTRY"
    );
    expect(allCountry).toBeDefined();
    expect(allCountry!.quantity).toBe(319895);
    expect(allCountry!.averagePurchasePrice).toBe(26259);
    expect(allCountry!.currentPrice).toBe(33857);
  });

  it("空のCSVでエラーを返す", () => {
    const result = sbiAdapter.parseCSV("");
    expect(result.ok).toBe(false);
  });

  it("データなしのCSVでエラーを返す", () => {
    const csvNoData = `"ポートフォリオ一覧",
"一括表示",
"総合計",
"評価額","含み損益",
0,0`;
    const result = sbiAdapter.parseCSV(csvNoData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("検出できませんでした");
    }
  });

  it("株式のみのCSVを処理できる", () => {
    const stockOnlyCsv = `"ポートフォリオ一覧",
"株式（現物/特定預り）",
"銘柄（コード）","買付日","数量","取得単価","現在値","前日比","前日比（％）","損益","損益（％）","評価額",
"7203 トヨタ","2024/01/10",100,2500,2800,+30,+1.08,+30000,+12.00,280000,
"株式(現物/特定預り)合計",
"評価額","含み損益",
280000,+30000`;

    const result = sbiAdapter.parseCSV(stockOnlyCsv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toHaveLength(1);
    expect(result.value[0].ticker).toBe("7203");
    expect(result.value[0].name).toBe("トヨタ");
    expect(result.value[0].securityType).toBe(SecurityType.STOCK);
  });

  it("BOM付きCSVを処理できる", () => {
    const bomCsv = "\uFEFF" + SAMPLE_SBI_CSV;
    const result = sbiAdapter.parseCSV(bomCsv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(7);
  });

  it("getCSVFormatDescription が説明を返す", () => {
    const desc = sbiAdapter.getCSVFormatDescription();
    expect(desc).toContain("SBI証券");
  });
});
