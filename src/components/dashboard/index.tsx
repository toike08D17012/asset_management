"use client";

import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardNav, type DashboardTab } from "@/components/dashboard/dashboard-nav";
import { Overview } from "@/components/dashboard/overview";
import { AccountsPanel } from "@/components/accounts-panel";
import { CSVImportModal } from "@/components/csv-import-modal";
import type { MarketColumnId } from "@/components/holdings-table";

export function Dashboard() {
  const {
    portfolio,
    holdings,
    accounts,
    loadingPortfolio,
    loadingHoldings,
    loadingAccounts,
    refreshing,
    refreshData,
    error,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showImport, setShowImport] = useState(false);
  const [refreshingColumns, setRefreshingColumns] = useState<Set<MarketColumnId>>(new Set());
  const [refreshingUrls, setRefreshingUrls] = useState(false);
  const [refreshingAllMarketData, setRefreshingAllMarketData] = useState(false);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  async function refreshMarketData(url: string, fallbackErrorMessage: string): Promise<void> {
    setMarketDataError(null);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        typeof body?.error === "string" && body.error.length > 0
          ? body.error
          : fallbackErrorMessage
      );
    }
    await refreshData();
  }

  const forceRefreshColumn = async (columnId: MarketColumnId) => {
    if (refreshingColumns.has(columnId) || refreshingUrls || refreshingAllMarketData) return;
    setRefreshingColumns(prev => new Set(prev).add(columnId));
    try {
      await refreshMarketData(
        "/api/holdings?aggregate=true&marketData=live&forceRefresh=true",
        `${columnId}の更新に失敗しました`
      );
    } catch (error) {
      setMarketDataError(error instanceof Error ? error.message : `${columnId}の更新に失敗しました`);
    } finally {
      setRefreshingColumns(prev => {
        const next = new Set(prev);
        next.delete(columnId);
        return next;
      });
    }
  };

  const forceRefreshAllMarketData = async () => {
     if (refreshingAllMarketData || refreshingUrls || refreshingColumns.size > 0) return;
     setRefreshingAllMarketData(true);
     try {
       await refreshMarketData(
         "/api/holdings?aggregate=true&marketData=live&forceRefresh=true",
         "市場データの全更新に失敗しました"
       );
     } catch (error) {
       setMarketDataError(error instanceof Error ? error.message : "市場データの全更新に失敗しました");
     } finally {
       setRefreshingAllMarketData(false);
     }
  };

  const forceResolveYahooUrls = async () => {
    if (refreshingUrls || refreshingAllMarketData || refreshingColumns.size > 0) return;
    setRefreshingUrls(true);
    try {
      await refreshMarketData(
        "/api/holdings?aggregate=true&marketData=live&forceRefresh=true&forceResolveSymbol=true",
        "Yahooシンボルの再解決に失敗しました"
      );
    } catch (error) {
      setMarketDataError(error instanceof Error ? error.message : "Yahooシンボルの再解決に失敗しました");
    } finally {
      setRefreshingUrls(false);
    }
  };

  const handleTabChange = (tab: DashboardTab) => {
    if (tab === "import") {
      setShowImport(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <DashboardLayout
      sidebar={<DashboardNav activeTab={activeTab} onTabChange={handleTabChange} />}
    >
      <div className="space-y-6">
        <header className="flex justify-between items-center pb-6 border-b border-border">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "overview" && "ダッシュボード"}
            {activeTab === "accounts" && "口座管理"}
          </h1>
          <div className="text-sm text-muted-foreground">
            {refreshing ? "更新中..." : "最終更新: " + new Date().toLocaleTimeString()}
          </div>
        </header>

        {(error || marketDataError) && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {marketDataError ?? error}
          </div>
        )}

        {activeTab === "overview" && (
          <Overview
            portfolio={portfolio}
            holdings={holdings}
            loadingPortfolio={loadingPortfolio}
            loadingHoldings={loadingHoldings}
            refreshingAll={refreshingAllMarketData}
            refreshingColumns={refreshingColumns}
            onRefreshCol={forceRefreshColumn}
            onRefreshAll={forceRefreshAllMarketData}
            onRefreshUrls={forceResolveYahooUrls}
            refreshingUrls={refreshingUrls}
            onImport={() => setShowImport(true)}
          />
        )}

        {activeTab === "accounts" && (
           <div className="space-y-4">
             {loadingAccounts && accounts.length === 0 ? (
               <div className="animate-pulse h-64 bg-muted rounded-xl" />
             ) : (
               <AccountsPanel accounts={accounts} onRefresh={refreshData} />
             )}
           </div>
        )}
      </div>

      {showImport && (
        <CSVImportModal
          accounts={accounts}
          onClose={() => setShowImport(false)}
          onImportComplete={refreshData}
        />
      )}
    </DashboardLayout>
  );
}
