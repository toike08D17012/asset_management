import { describe, it, expect } from "vitest";
import {
  normalizeYahooSymbol,
  toGoogleFinanceSymbol,
  parseYahooJapanHtml,
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

    expect(jp).toBe("TYO:8306");
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
});
