import { useState, useCallback, useEffect } from "react";
import type { PortfolioData, AccountSummary, HoldingData } from "@/types/api";

interface UseDashboardDataResult {
  portfolio: PortfolioData | null;
  holdings: HoldingData[];
  accounts: AccountSummary[];
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

    // Portfolio
    const portfolioTask = (async () => {
      try {
        const res = await fetch("/api/portfolio");
        if (res.ok) {
          const data = await res.json();
          setPortfolio(data.portfolio);
        } else {
          console.error("Failed to fetch portfolio");
        }
      } catch (err) {
        console.error("Portfolio fetch error:", err);
      } finally {
        setLoadingPortfolio(false);
      }
    })();

    // Holdings
    const holdingsTask = (async () => {
      try {
        // Cache first
        const cacheRes = await fetch("/api/holdings?aggregate=true&marketData=cache");
        if (cacheRes.ok) {
          const data = await cacheRes.json();
          setHoldings(data.holdings || []);

          // Live update in background
          void (async () => {
            try {
              const liveRes = await fetch("/api/holdings?aggregate=true&marketData=live");
              if (liveRes.ok) {
                const liveData = await liveRes.json();
                setHoldings(liveData.holdings || []);
              }
            } catch (err) {
              console.error("Live holdings update error:", err);
            }
          })();
        } else {
          console.error("Failed to fetch holdings (cache)");
        }
      } catch (err) {
        console.error("Holdings fetch error:", err);
      } finally {
        setLoadingHoldings(false);
      }
    })();

    // Accounts
    const accountsTask = (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.status === 401) {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("encryptionUnlocked");
              // Let the component handle redirect/reload logic if needed, 
              // or handle it here if global
              window.location.reload(); 
            }
            return;
        }

        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        } else {
           const data = await res.json().catch(() => ({}));
           console.error("Failed to fetch accounts:", data?.error || res.statusText);
           setError(data?.error || "Failed to fetch accounts");
        }
      } catch (err) {
        console.error("Accounts fetch error:", err);
        setError("Network error fetching accounts");
      } finally {
        setLoadingAccounts(false);
      }
    })();

    await Promise.all([portfolioTask, holdingsTask, accountsTask]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    portfolio,
    holdings,
    accounts,
    loadingPortfolio,
    loadingHoldings,
    loadingAccounts,
    refreshing,
    refreshData: fetchData,
    error,
  };
}
