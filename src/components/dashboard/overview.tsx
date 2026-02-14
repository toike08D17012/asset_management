import { useState, useMemo, useEffect } from "react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { HoldingsTable } from "@/components/holdings-table";
import { AssetAllocationCharts } from "@/components/dashboard/asset-allocation-charts";
import type { PortfolioData, HoldingData } from "@/types/api";
import { EmptyState } from "@/components/dashboard/empty-state";

type MarketColumnId = "sector" | "dividendYield" | "currentPrice";
type HoldingsDisplayMode = "mixed" | "split";
const STORAGE_KEY = "dashboard-overview-display-mode";

interface OverviewProps {
  portfolio: PortfolioData | null;
  holdings: HoldingData[];
  loadingPortfolio: boolean;
  loadingHoldings: boolean;
  refreshing: boolean;
  onRefreshCol?: (col: MarketColumnId) => void;
  onRefreshAll?: () => void;
  refreshingColumns: Set<MarketColumnId>;
  onImport: () => void;
}

export function Overview({
  portfolio,
  holdings,
  loadingPortfolio,
  loadingHoldings,
  refreshing,
  onRefreshCol,
  onRefreshAll,
  refreshingColumns,
  onImport,
}: OverviewProps) {
  const [displayMode, setDisplayMode] = useState<HoldingsDisplayMode>("mixed");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY);
      if (savedMode === "mixed" || savedMode === "split") {
        setDisplayMode(savedMode);
      }
    } catch (e) {
      console.warn("Failed to read display mode from local storage", e);
    }
  }, []);

  const handleDisplayModeChange = (mode: HoldingsDisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn("Failed to save display mode to local storage", e);
    }
  };

  const stockHoldings = useMemo(() => 
    holdings.filter(h => h.security.type === "stock"), 
    [holdings]
  );
  
  const mutualFundHoldings = useMemo(() => 
    holdings.filter(h => h.security.type === "mutualFund"), 
    [holdings]
  );

  if (loadingPortfolio || loadingHoldings) {
    if (!portfolio && holdings.length === 0) {
      return (
        <div className="space-y-6 animate-pulse">
           <div className="h-48 bg-muted rounded-xl"></div>
           <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      );
    }
  }

  if (!portfolio && holdings.length === 0) {
    return <EmptyState onImport={onImport} />;
  }

  return (
    <div className="space-y-8">
      {portfolio && <PortfolioSummary portfolio={portfolio} />}
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">保有資産</h2>
          <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => handleDisplayModeChange("mixed")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                displayMode === "mixed"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => handleDisplayModeChange("split")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                displayMode === "split"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              種別ごと
            </button>
          </div>
        </div>

        {displayMode === "mixed" ? (
          <div className="space-y-8">
            <AssetAllocationCharts holdings={holdings} />
            <HoldingsTable
              title="全銘柄一覧"
              description="すべての保有銘柄を表示します"
              holdings={holdings}
              onForceRefreshColumn={(id) => onRefreshCol?.(id as MarketColumnId)}
              onForceRefreshAll={onRefreshAll}
              refreshingColumns={refreshingColumns as any} 
              refreshingAll={refreshing}
            />
          </div>
        ) : (
          <div className="space-y-12">
            <div className="space-y-6">
              <AssetAllocationCharts holdings={stockHoldings} />
              <HoldingsTable
                title="株式・ETF・REIT"
                description="市場で取引される銘柄"
                holdings={stockHoldings}
                onForceRefreshColumn={(id) => onRefreshCol?.(id as MarketColumnId)}
                onForceRefreshAll={onRefreshAll}
                refreshingColumns={refreshingColumns as any}
                refreshingAll={refreshing}
              />
            </div>
            <div className="space-y-6">
              <AssetAllocationCharts holdings={mutualFundHoldings} />
              <HoldingsTable
                title="投資信託"
                description="基準価額で取引される銘柄"
                holdings={mutualFundHoldings}
                onForceRefreshColumn={(id) => onRefreshCol?.(id as MarketColumnId)}
                onForceRefreshAll={onRefreshAll}
                refreshingColumns={refreshingColumns as any}
                refreshingAll={refreshing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
