import { useState, useMemo, useEffect } from "react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { HoldingsTable, type MarketColumnId } from "@/components/holdings-table";
import { AssetAllocationCharts } from "@/components/dashboard/asset-allocation-charts";
import type { PortfolioData, HoldingData } from "@/types/api";
import { EmptyState } from "@/components/dashboard/empty-state";

type HoldingsDisplayMode = "mixed" | "split";
type SplitAssetType = "stock" | "mutualFund";
const STORAGE_KEY = "dashboard-overview-display-mode";
const SPLIT_ASSET_TYPE_STORAGE_KEY = "dashboard-overview-split-asset-type";

interface OverviewProps {
  portfolio: PortfolioData | null;
  holdings: HoldingData[];
  loadingPortfolio: boolean;
  loadingHoldings: boolean;
  refreshingAll?: boolean;
  onRefreshCol?: (col: MarketColumnId) => void;
  onRefreshAll?: () => void;
  onRefreshUrls?: () => void;
  refreshingColumns: Set<MarketColumnId>;
  refreshingUrls?: boolean;
  onImport: () => void;
}

export function Overview({
  portfolio,
  holdings,
  loadingPortfolio,
  loadingHoldings,
  refreshingAll,
  onRefreshCol,
  onRefreshAll,
  onRefreshUrls,
  refreshingColumns,
  refreshingUrls,
  onImport,
}: OverviewProps) {
  const [displayMode, setDisplayMode] = useState<HoldingsDisplayMode>("mixed");
  const [splitAssetType, setSplitAssetType] = useState<SplitAssetType>("stock");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY);
      if (savedMode === "mixed" || savedMode === "split") {
        setDisplayMode(savedMode);
      }

      const savedSplitAssetType = localStorage.getItem(SPLIT_ASSET_TYPE_STORAGE_KEY);
      if (savedSplitAssetType === "stock" || savedSplitAssetType === "mutualFund") {
        setSplitAssetType(savedSplitAssetType);
      }
    } catch (e) {
      console.warn("Failed to read dashboard settings from local storage", e);
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

  const handleSplitAssetTypeChange = (type: SplitAssetType) => {
    setSplitAssetType(type);
    try {
      localStorage.setItem(SPLIT_ASSET_TYPE_STORAGE_KEY, type);
    } catch (e) {
      console.warn("Failed to save split asset type to local storage", e);
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

  const activeSplitAssetType = useMemo<SplitAssetType>(() => {
    if (splitAssetType === "stock" && stockHoldings.length === 0 && mutualFundHoldings.length > 0) {
      return "mutualFund";
    }

    if (splitAssetType === "mutualFund" && mutualFundHoldings.length === 0 && stockHoldings.length > 0) {
      return "stock";
    }

    return splitAssetType;
  }, [splitAssetType, stockHoldings.length, mutualFundHoldings.length]);

  const activeSplitHoldings = activeSplitAssetType === "stock" ? stockHoldings : mutualFundHoldings;
  const activeSplitTitle = activeSplitAssetType === "stock" ? "株式・ETF・REIT" : "投資信託";
  const activeSplitDescription =
    activeSplitAssetType === "stock"
      ? "市場で取引される銘柄"
      : "基準価額で取引される銘柄";

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
              onForceRefreshColumn={(id) => onRefreshCol?.(id)}
              onForceRefreshAll={onRefreshAll}
              onForceRefreshUrls={onRefreshUrls}
              refreshingColumns={refreshingColumns}
              refreshingAll={refreshingAll}
              refreshingUrls={refreshingUrls}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => handleSplitAssetTypeChange("stock")}
                  disabled={stockHoldings.length === 0}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeSplitAssetType === "stock"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  株式・ETF・REIT
                </button>
                <button
                  onClick={() => handleSplitAssetTypeChange("mutualFund")}
                  disabled={mutualFundHoldings.length === 0}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeSplitAssetType === "mutualFund"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  投資信託
                </button>
              </div>
            </div>
            <AssetAllocationCharts holdings={activeSplitHoldings} />
            <HoldingsTable
              title={activeSplitTitle}
              description={activeSplitDescription}
              holdings={activeSplitHoldings}
              onForceRefreshColumn={(id) => onRefreshCol?.(id)}
              onForceRefreshAll={onRefreshAll}
              onForceRefreshUrls={onRefreshUrls}
              refreshingColumns={refreshingColumns}
              refreshingAll={refreshingAll}
              refreshingUrls={refreshingUrls}
            />
          </div>
        )}
      </div>
    </div>
  );
}
