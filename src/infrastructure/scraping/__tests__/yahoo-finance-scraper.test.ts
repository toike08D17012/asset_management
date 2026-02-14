import { describe, it, expect } from "vitest";
import {
  normalizeYahooSymbol,
  toGoogleFinanceSymbol,
  parseYahooJapanHtml,
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
