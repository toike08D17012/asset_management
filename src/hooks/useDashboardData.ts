import { useState, useCallback, useEffect } from "react";
import type { PortfolioData, AccountSummary, HoldingData, SnapshotComparisonResponse } from "@/types/api";

interface UseDashboardDataResult {
  portfolio: PortfolioData | null;
  holdings: HoldingData[];
  accounts: AccountSummary[];
  snapshotComparison: SnapshotComparisonResponse | null;
  loadingPortfolio: boolean;
  loadingHoldings: boolean;
  loadingAccounts: boolean;
  refreshing: boolean;
  refreshData: () => Promise<void>;
  error: string | null;
}

export function useDashboardData(): UseDashboardDataResult {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [snapshotComparison, setSnapshotComparison] = useState<SnapshotComparisonResponse | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setLoadingPortfolio(true);
    setLoadingHoldings(true);
    setLoadingAccounts(true);
    setError(null);
    const setApiError = (message: string) => {
      setError((prev) => prev ?? message);
    };

    const portfolioTask = (async () => {
      try {
        const res = await fetch("/api/portfolio");
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("encryptionUnlocked");
            window.location.reload();
          }
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setPortfolio(data.portfolio);
        } else {
          const data = await res.json().catch(() => null);
          setApiError(
            typeof data?.error === "string" && data.error.length > 0
              ? data.error
              : "ポートフォリオ情報の取得に失敗しました"
          );
        }
      } catch {
        setApiError("ポートフォリオ情報の取得中に通信エラーが発生しました");
      } finally {
        setLoadingPortfolio(false);
      }
    })();

    const holdingsTask = (async () => {
      try {
        const cacheRes = await fetch("/api/holdings?aggregate=true&marketData=cache");
        if (cacheRes.status === 401) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("encryptionUnlocked");
            window.location.reload();
          }
          return;
        }
        if (cacheRes.ok) {
          const data = await cacheRes.json();
          setHoldings(data.holdings || []);

          void (async () => {
            try {
              const liveRes = await fetch("/api/holdings?aggregate=true&marketData=live");
              if (liveRes.ok) {
                const liveData = await liveRes.json();
                setHoldings(liveData.holdings || []);
              }
            } catch {
              // バックグラウンド更新は失敗しても静かに無視する
            }
          })();
        } else {
          const data = await cacheRes.json().catch(() => null);
          setApiError(
            typeof data?.error === "string" && data.error.length > 0
              ? data.error
              : "保有銘柄の取得に失敗しました"
          );
        }
      } catch {
        setApiError("保有銘柄の取得中に通信エラーが発生しました");
      } finally {
        setLoadingHoldings(false);
      }
    })();

    const accountsTask = (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.status === 401) {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("encryptionUnlocked");
              window.location.reload();
            }
            return;
        }

        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        } else {
           const data = await res.json().catch(() => ({}));
           setError(data?.error || "口座情報の取得に失敗しました");
        }
      } catch {
        setError("口座情報の取得中に通信エラーが発生しました");
      } finally {
        setLoadingAccounts(false);
      }
    })();

    const snapshotComparisonTask = (async () => {
      try {
        const res = await fetch("/api/snapshots?type=comparison");
        if (res.ok) {
          const data = await res.json();
          setSnapshotComparison(data);
        }
        // スナップショットが取得できない場合は静かに無視する（オプション機能）
      } catch {
        // 比較機能はオプションのためエラーを伝播しない
      }
    })();

    await Promise.all([portfolioTask, holdingsTask, accountsTask, snapshotComparisonTask]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    portfolio,
    holdings,
    accounts,
    snapshotComparison,
    loadingPortfolio,
    loadingHoldings,
    loadingAccounts,
    refreshing,
    refreshData: fetchData,
    error,
  };
}
