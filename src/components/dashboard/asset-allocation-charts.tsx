"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { HoldingData } from "@/types/api";
import { getMutualFundDivisor } from "@/lib/format";
import { normalizeSecurityNameForDisplay } from "@/lib/security-name-display";

interface AssetAllocationChartsProps {
  holdings: HoldingData[];
  title?: string;
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8",
  "#82ca9d", "#ffc658", "#8dd1e1", "#a4de6c", "#d0ed57",
  "#ffc0cb", "#c0c0c0", "#f4a460", "#fa8072", "#40e0d0"
];

function formatCurrency(value: number) {
  return `¥${Math.round(value).toLocaleString()}`;
}


function processChartData(data: { name: string; value: number }[], maxItems = 9) {
  if (data.length <= maxItems) return data;
  
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, maxItems);
  const others = sorted.slice(maxItems);
  
  if (others.length > 0) {
    const othersValue = others.reduce((sum, item) => sum + item.value, 0);
    top.push({ name: "その他", value: othersValue });
  }
  
  return top;
}

export function AssetAllocationCharts({ holdings, title }: AssetAllocationChartsProps) {
  const { dataByTicker, dataBySector, totalValue } = useMemo(() => {
    const tickerMap = new Map<string, number>();
    const sectorMap = new Map<string, number>();
    let total = 0;

    holdings.forEach((h) => {
      const qty = h.totalQuantity?.value ?? h.quantity?.value ?? 0;
      const curPrice = h.currentPrice?.amount ?? 0;
      // Prevent division by zero if divisor is somehow 0, though getMutualFundDivisor defaults to 1 or 10000
      const divisor = getMutualFundDivisor(h.security.type) || 1; 
      const marketValue = (qty * curPrice) / divisor;

      if (marketValue <= 0) return;

      total += marketValue;

      // By Ticker
      const displayName = normalizeSecurityNameForDisplay(h.security.name);
      const tickerKey = displayName || h.security.ticker;
      tickerMap.set(tickerKey, (tickerMap.get(tickerKey) || 0) + marketValue);

      // By Sector
      const sectorKey = h.sector ? 
        (h.sector === "Unknown" ? "その他" : h.sector) : 
        "その他";
      sectorMap.set(sectorKey, (sectorMap.get(sectorKey) || 0) + marketValue);
    });

    const byTickerRaw = Array.from(tickerMap.entries())
      .map(([name, value]) => ({ name, value }));

    const bySectorRaw = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }));

    const byTicker = processChartData(byTickerRaw);
    const bySector = processChartData(bySectorRaw);

    return { dataByTicker: byTicker, dataBySector: bySector, totalValue: total };
  }, [holdings]);

  // If no data to show, don't render anything
  if (!holdings?.length || totalValue <= 0) {
    return null;
  }

  // Common props for Pie to ensure consistency
  const pieProps = {
    cx: "50%",
    cy: "40%",
    innerRadius: 0,
    outerRadius: 90, // Fixed radius to avoid "collapsed" look
    paddingAngle: 0,
    dataKey: "value",
  };

  return (
    <div className="space-y-6">
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Ticker */}
        <div className="bg-card p-4 rounded-xl shadow-sm border flex flex-col min-h-[400px]">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">銘柄別構成比</h4>
          <div className="w-full flex-1 min-h-0 relative">
             {/* 
                ResponsiveContainer needs a parent with definite height. 
                Using absolute positioning wrapper to ensure it fills the flex container correctly 
             */}
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataByTicker}
                    {...pieProps}
                    nameKey="name"
                    fill="#8884d8"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                       const RADIAN = Math.PI / 180;
                       const radius = outerRadius * 1.2;
                       const x = cx + radius * Math.cos(-midAngle * RADIAN);
                       const y = cy + radius * Math.sin(-midAngle * RADIAN);
                       
                       if (percent < 0.05) return null;
                       
                       return (
                         <text 
                           x={x} 
                           y={y} 
                           fill="currentColor" 
                           textAnchor={x > cx ? 'start' : 'end'} 
                           dominantBaseline="central"
                           className="text-xs"
                         >
                           {`${(percent * 100).toFixed(0)}%`}
                         </text>
                       );
                    }}
                  >
                    {dataByTicker.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By Sector */}
        <div className="bg-card p-4 rounded-xl shadow-sm border flex flex-col min-h-[400px]">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">セクター別構成比</h4>
          <div className="w-full flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataBySector}
                    {...pieProps}
                    fill="#82ca9d"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                       const RADIAN = Math.PI / 180;
                       const radius = outerRadius * 1.2;
                       const x = cx + radius * Math.cos(-midAngle * RADIAN);
                       const y = cy + radius * Math.sin(-midAngle * RADIAN);
                       
                       if (percent < 0.05) return null;
                       
                       return (
                         <text 
                           x={x} 
                           y={y} 
                           fill="currentColor" 
                           textAnchor={x > cx ? 'start' : 'end'} 
                           dominantBaseline="central"
                           className="text-xs"
                         >
                           {`${(percent * 100).toFixed(0)}%`}
                         </text>
                       );
                    }}
                  >
                    {dataBySector.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
