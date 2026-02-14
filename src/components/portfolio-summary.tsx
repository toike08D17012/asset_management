"use client";

import type { PortfolioData } from "@/types/api";
import { formatJPY, formatUSD } from "@/lib/format";

export function PortfolioSummary({
  portfolio,
}: {
  portfolio: PortfolioData | null;
}) {
  if (!portfolio) {
    return null;
  }

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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className={`flex items-center text-sm font-medium ${card.trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
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


