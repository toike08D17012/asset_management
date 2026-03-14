"use client";

import type { PortfolioData } from "@/types/api";
import type { HoldingData } from "@/types/api";
import { formatJPY, formatUSD } from "@/lib/format";
import { getMutualFundDivisor } from "@/lib/format";

export function PortfolioSummary({
  portfolio,
  holdings,
}: {
  portfolio: PortfolioData | null;
  holdings: HoldingData[];
}) {
  if (!portfolio) {
    return null;
  }

  let annualDividendJPY = 0;
  let annualDividendUSD = 0;

  for (const holding of holdings) {
    if (typeof holding.dividendYield !== "number") {
      continue;
    }

    const quantity = holding.totalQuantity?.value ?? holding.quantity?.value ?? 0;
    const currentPrice = holding.currentPrice?.amount ?? 0;
    const divisor = getMutualFundDivisor(holding.security.type);
    const annualDividend = (quantity * currentPrice * holding.dividendYield) / divisor;

    if (holding.security.currency === "JPY") {
      annualDividendJPY += annualDividend;
    } else {
      annualDividendUSD += annualDividend;
    }
  }

  const annualDividendDisplayParts: string[] = [];
  if (annualDividendJPY > 0) {
    annualDividendDisplayParts.push(formatJPY(annualDividendJPY));
  }
  if (annualDividendUSD > 0) {
    annualDividendDisplayParts.push(formatUSD(annualDividendUSD));
  }

  const annualDividendDisplay = annualDividendDisplayParts.join(" / ") || "-";
  const annualDividendYieldDisplayParts: string[] = [];

  if (portfolio.totalValueJPY > 0) {
    annualDividendYieldDisplayParts.push(
      `${((annualDividendJPY / portfolio.totalValueJPY) * 100).toFixed(2)}% (JPY)`
    );
  }

  if (portfolio.totalValueUSD > 0) {
    annualDividendYieldDisplayParts.push(
      `${((annualDividendUSD / portfolio.totalValueUSD) * 100).toFixed(2)}% (USD)`
    );
  }

  const annualDividendYieldDisplay = annualDividendYieldDisplayParts.join(" / ") || "-";

  const cards = [
    {
      title: "総資産評価額 (JPY)",
      value: formatJPY(portfolio.totalValueJPY),
      subtext: portfolio.totalCostJPY > 0 ? `取得額: ${formatJPY(portfolio.totalCostJPY)}` : undefined,
      trend: portfolio.gainLossJPY,
      trendPercent: portfolio.totalCostJPY ? (portfolio.gainLossJPY / portfolio.totalCostJPY) * 100 : 0,
      currency: "¥",
      simple: false,
    },
    {
      title: "総資産評価額 (USD)",
      value: formatUSD(portfolio.totalValueUSD),
      subtext: portfolio.totalCostUSD > 0 ? `取得額: ${formatUSD(portfolio.totalCostUSD)}` : undefined,
      trend: portfolio.gainLossUSD,
      trendPercent: portfolio.totalCostUSD ? (portfolio.gainLossUSD / portfolio.totalCostUSD) * 100 : 0,
      currency: "$",
      simple: false,
    },
    {
      title: "保有銘柄数",
      value: portfolio.holdingsCount,
      subtext: "銘柄",
      simple: true,
    },
    {
      title: "連携口座数",
      value: portfolio.accountsCount,
      subtext: "口座",
      simple: true,
    },
    {
      title: "年間配当総額（予想）",
      value: annualDividendDisplay,
      subtext: `現在値ベース利回り: ${annualDividendYieldDisplay}`,
      simple: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{card.value}</span>
            {card.simple && <span className="text-sm text-muted-foreground ml-1">{card.subtext}</span>}
          </div>
          
          {!card.simple && (
            <div className="mt-1">
              {card.trend !== undefined && (
                <div className={`flex items-center text-sm font-medium ${card.trend >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                  {card.trend >= 0 ? "+" : ""}{formatCurrency(card.trend, card.currency)}
                  <span className="ml-1">
                    ({card.trend >= 0 ? "+" : ""}{card.trendPercent?.toFixed(2)}%)
                  </span>
                </div>
              )}
               <p className="text-xs text-muted-foreground mt-1">{card.subtext}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatCurrency(val: number, sign?: string) {
  if (sign === "¥") return `¥${Math.round(val).toLocaleString()}`;
  if (sign === "$") return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return val.toLocaleString();
}


