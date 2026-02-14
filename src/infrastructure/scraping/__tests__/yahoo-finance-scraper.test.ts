import { describe, it, expect } from "vitest";
import {
  normalizeYahooSymbol,
  toGoogleFinanceSymbol,
  parseYahooJapanHtml,
  extractPreloadedState,
  parseYahooJapanFundReferenceInformationDividendYield,
  extractYahooSymbolsFromSearchHtml,
  rankYahooSymbolsByQueryFromSearchHtml,
} from "@/infrastructure/scraping/yahoo-finance-scraper";

describe("yahoo-finance-scraper", () => {
  it("日本株コードをYahoo形式に変換する", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "7203",
      currency: "JPY",
      securityType: "stock",
    });

    expect(symbol).toBe("7203.T");
  });

  it("米国株ティッカーはそのまま使う", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "vym",
      currency: "USD",
      securityType: "stock",
    });

    expect(symbol).toBe("VYM");
  });

  it("アプリ独自投信ティッカーはYahoo対象外", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "FUND-ABC",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBeNull();
  });

  it("投資信託の日本語名は直接シンボルにしない", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "ｅＭＡＸＩＳ　Ｓｌｉｍ　全世界株式（オール・カントリー）",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBeNull();
  });

  it("投資信託コードらしい値はそのまま使う", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "0331418A",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBe("0331418A");
  });

  it("既知の投資信託(欧州)は正式名称からシンボルを確定できる", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "SBI-EU-DIV",
      name: "ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBe("8931C242");
  });

  it("既知の投資信託(日本)は正式名称からシンボルを確定できる", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "SBI-JPN-DIV",
      name: "ＳＢＩ日本高配当株式（分配）ファンド（年４回決算型）",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBe("8931123C");
  });

  it("未知の投資信託擬似ティッカーは検索に委譲する", () => {
    const symbol = normalizeYahooSymbol({
      ticker: "SBI-UNKNOWN",
      name: "ＳＢＩ未定義ファンド",
      currency: "JPY",
      securityType: "mutualFund",
    });

    expect(symbol).toBeNull();
  });

  it("Google Finance用シンボルを生成する", () => {
    const jp = toGoogleFinanceSymbol({
      ticker: "8306",
      currency: "JPY",
      securityType: "stock",
    });
    const us = toGoogleFinanceSymbol({
      ticker: "MSFT",
      currency: "USD",
      securityType: "stock",
    });

    expect(jp).toBe("8306:TYO");
    expect(us).toBe("MSFT");
  });

  it("Yahoo!ファイナンス日本版HTMLから業種と配当利回りを抽出できる", () => {
    const html = `
      <html><head></head><body>
      <script>
      window.__PRELOADED_STATE__ = {
        "mainStocksPriceBoard": {
          "priceBoard": {
            "industry": { "industryName": "輸送用機器" },
            "shareDividendYield": 2.52
          }
        }
      };
      </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.sector).toBe("輸送用機器");
    expect(parsed?.dividendYield).toBeCloseTo(0.0252, 6);
  });

  it("投資信託ページ相当のHTMLから基準価額を抽出できる", () => {
    const html = `
      <html><body>
        <script>
          window.__SOME_STATE__ = {
            "fundDetail": {
              "standardPrice": "13,682",
              "distributionYield": 3.21
            }
          };
        </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(13682);
    expect(parsed?.dividendYield).toBeCloseTo(0.0321, 6);
  });

  it("投資信託ページで直近分配金と決算頻度から分配利回りを推定できる", () => {
    const html = `
      <html><body>
        <div>基準価額 16,417円</div>
        <div>決算頻度（年） 4回</div>
        <div>直近分配金 140円</div>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(16417);
    expect(parsed?.dividendYield).toBeCloseTo((140 * 4) / 16417, 6);
  });

  it("スクリプト構造が変わっても本文テキストから基準価額を抽出できる", () => {
    const html = `
      <html><body>
        <div>基準価額 14,321円</div>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(14321);
  });

  it("全角数字+円表記の基準価額を抽出できる", () => {
    const html = `
      <html><body>
        <script>
          window.__ANY_STATE__ = {
            "fundDetail": {
              "standardPrice": "３３,３６６円"
            }
          };
        </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(33366);
  });

  it("投資信託のPRELOADED_STATEでは fundPrices.price を優先する", () => {
    const html = `
      <html><body>
        <script>
          window.__PRELOADED_STATE__ = {
            "mainCurrencyRateCalculation": { "price": "1" },
            "mainFundPriceBoard": {
              "fundPrices": {
                "price": "33,366"
              }
            }
          };
        </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(33366);
  });

  it("PRELOADED_STATEは末尾セミコロンなしでも抽出できる", () => {
    const html = `
      <html><body>
        <script>
          window.__PRELOADED_STATE__ = {
            "mainFundPriceBoard": {
              "fundPrices": {
                "price": "13,547"
              }
            }
          }
        </script>
      </body></html>
    `;

    const state = extractPreloadedState(html);

    expect(state).not.toBeNull();
    expect(state?.mainFundPriceBoard?.fundPrices?.price).toBe("13,547");
  });

  it("投資信託のPRELOADED_STATEから直近分配金と決算頻度で分配利回りを算出できる", () => {
    const html = `
      <html><body>
        <script>
          window.__PRELOADED_STATE__ = {
            "mainFundPriceBoard": {
              "fundPrices": {
                "price": "13,547"
              }
            },
            "mainFundDetail": {
              "items": {
                "settlementFrequency": "4",
                "recentDividend": "170"
              }
            }
          }
        </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).not.toBeNull();
    expect(parsed?.currentPrice).toBe(13547);
    expect(parsed?.dividendYield).toBeCloseTo((170 * 4) / 13547, 6);
  });

  it("投信参照情報APIの分配金利回りを正規化して取得できる", () => {
    const normalized = parseYahooJapanFundReferenceInformationDividendYield({
      settlementAndDividend: {
        dividendYield: "4.79",
      },
    });

    expect(normalized).toBeCloseTo(0.0479, 6);
  });

  it("投信参照情報APIのネスト形式でも分配金利回りを取得できる", () => {
    const normalized = parseYahooJapanFundReferenceInformationDividendYield({
      referenceInformation: {
        settlementAndDividend: {
          dividendYield: 5.01,
        },
      },
    });

    expect(normalized).toBeCloseTo(0.0501, 6);
  });

  it("数値以外の currentPrice 文字列を価格として誤抽出しない", () => {
    const html = `
      <html><body>
        <script>
          window.__ANY_STATE__ = {
            "fundDetail": {
              "currentPrice": "1年"
            }
          };
        </script>
      </body></html>
    `;

    const parsed = parseYahooJapanHtml(html);

    expect(parsed).toBeNull();
  });

  it("検索結果HTMLからYahooシンボル候補を抽出できる", () => {
    const html = `
      <html><body>
        <a href="/quote/0331418A">オルカン</a>
        <a href="https://finance.yahoo.co.jp/quote/7203.T/">トヨタ</a>
        <a href="/quote/0331418A/history">重複</a>
      </body></html>
    `;

    const symbols = extractYahooSymbolsFromSearchHtml(html);

    expect(symbols).toEqual(["0331418A", "7203.T"]);
  });

  it("検索結果は正式名称一致を優先してシンボル候補を並べる", () => {
    const query = "ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）";
    const html = `
      <html><body>
        <a href="/quote/9999A111">ＳＢＩ米国高配当株式（分配）ファンド（年４回決算型）</a>
        <a href="/quote/8931C242">ＳＢＩ欧州高配当株式（分配）ファンド（年４回決算型）</a>
        <a href="/quote/1111B222">ＳＢＩ日本高配当株式（分配）ファンド（年４回決算型）</a>
      </body></html>
    `;

    const symbols = rankYahooSymbolsByQueryFromSearchHtml(html, query);

    expect(symbols[0]).toBe("8931C242");
  });
});
