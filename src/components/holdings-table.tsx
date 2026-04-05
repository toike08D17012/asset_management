"use client";

import { useEffect, useMemo, useState } from "react";
import type { HoldingData, SnapshotComparisonResponse, SnapshotHoldingComparison, SnapshotComparisonEntry } from "@/types/api";
import { formatJPY, formatUSD, getMutualFundDivisor } from "@/lib/format";
import { normalizeSecurityNameForDisplay } from "@/lib/security-name-display";

type ColumnId = 
  | "security"
  | "sector"
  | "dividendYield"
  | "dividendYieldCost"
  | "quantity"
  | "currentPrice"
  | "averagePrice"
  | "marketValue"
  | "gainLoss"
  | "dividends"
  | "yahooLink"
  | "googleLink";

export type MarketColumnId = "sector" | "dividendYield" | "currentPrice";
type SortDirection = "asc" | "desc";

interface SortState {
  columnId: ColumnId;
  direction: SortDirection;
}

interface ColumnDef {
  id: ColumnId;
  label: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

const BASE_COLUMNS: ColumnDef[] = [
  { id: "security", label: "銘柄", sortable: true },
  { id: "sector", label: "セクター", sortable: true },
  { id: "dividendYield", label: "配当利回り", align: "right", sortable: true },
  { id: "dividendYieldCost", label: "取得配当利回り", align: "right", sortable: true },
  { id: "quantity", label: "保有数", align: "right", sortable: true },
  { id: "currentPrice", label: "現在値", align: "right", sortable: true },
  { id: "averagePrice", label: "平均取得単価", align: "right", sortable: true },
  { id: "marketValue", label: "評価額", align: "right", sortable: true },
  { id: "gainLoss", label: "評価損益", align: "right", sortable: true },
  { id: "dividends", label: "予想配当金", align: "right", sortable: true },
  { id: "yahooLink", label: "Yahoo Finance", align: "center" },
  { id: "googleLink", label: "Google Finance", align: "center" },
];

const SORT_STORAGE_KEY = "holdings-table-sort-v1";
const DIFF_MODE_STORAGE_KEY = "holdings-table-diff-mode-v1";
const DEFAULT_SORT_STATE: SortState = { columnId: "security", direction: "asc" };
const REFRESHABLE_COLUMNS: readonly MarketColumnId[] = ["sector", "dividendYield", "currentPrice"];

type DiffMode = "none" | "prevDay" | "prevMonth";

function getComparisonEntry(
  snapshotComparison: SnapshotComparisonResponse | null | undefined,
  diffMode: DiffMode
): SnapshotComparisonEntry | null {
  if (!snapshotComparison || diffMode === "none") return null;
  return diffMode === "prevDay" ? snapshotComparison.previousDay : snapshotComparison.previousMonth;
}

function findComparisonHolding(
  entry: SnapshotComparisonEntry,
  ticker: string,
  securityType: string
): SnapshotHoldingComparison | null {
  return entry.holdings.find((h) => h.ticker === ticker && h.securityType === securityType) ?? null;
}

function isColumnId(value: unknown): value is ColumnId {
  return typeof value === "string" && BASE_COLUMNS.some((c) => c.id === value);
}

function isMarketColumnId(value: ColumnId): value is MarketColumnId {
  return REFRESHABLE_COLUMNS.includes(value as MarketColumnId);
}

function getDisplayColumns(isMutualFundOnly: boolean): ColumnDef[] {
  if (!isMutualFundOnly) {
    return BASE_COLUMNS;
  }

  return BASE_COLUMNS.map((column) => {
    if (column.id === "dividendYield") {
      return { ...column, label: "分配利回り" };
    }

    if (column.id === "dividendYieldCost") {
      return { ...column, label: "取得分配利回り" };
    }

    if (column.id === "dividends") {
      return { ...column, label: "予想分配金" };
    }

    return column;
  });
}

function getStoredSortState(): SortState {
  try {
    const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return DEFAULT_SORT_STATE;
    const parsed = JSON.parse(raw) as Partial<SortState>;
    if (isColumnId(parsed.columnId) && (parsed.direction === "asc" || parsed.direction === "desc")) {
      return { columnId: parsed.columnId, direction: parsed.direction };
    }
  } catch {}
  return DEFAULT_SORT_STATE;
}

function getSortValue(h: HoldingData, columnId: ColumnId): number | string {
  const qty = h.totalQuantity?.value ?? h.quantity?.value ?? 0;
  const avgPrice = h.weightedAveragePrice?.amount ?? h.averagePurchasePrice?.amount ?? 0;
  const curPrice = h.currentPrice?.amount ?? 0;
  const divisor = getMutualFundDivisor(h.security.type);
  const displayName = normalizeSecurityNameForDisplay(h.security.name);

  switch (columnId) {
    case "security":
      return h.security.type === "mutualFund"
        ? displayName
        : `${h.security.ticker} ${displayName}`;
    case "sector": return h.sector ?? "";
    case "dividendYield": return h.dividendYield ?? -1;
    case "dividendYieldCost": {
       const annualDividendPerUnit = typeof h.dividendYield === "number" ? curPrice * h.dividendYield : null;
       return annualDividendPerUnit !== null && avgPrice > 0 ? annualDividendPerUnit / avgPrice : -1;
    }
    case "quantity": return qty;
    case "currentPrice": return curPrice;
    case "averagePrice": return avgPrice;
    case "marketValue": return (qty * curPrice) / divisor;
    case "gainLoss": {
      const totalCost = (qty * avgPrice) / divisor;
      const currentValue = (qty * curPrice) / divisor;
      return currentValue - totalCost;
    }
    case "dividends": {
       const annualDividendPerUnit = typeof h.dividendYield === "number" ? curPrice * h.dividendYield : null;
       return annualDividendPerUnit !== null ? (qty * annualDividendPerUnit) / divisor : -1;
    }
    case "yahooLink": return h.yahooSymbol ?? h.security.ticker;
    case "googleLink": return h.googleSymbol ?? h.security.ticker;
    default: return "";
  }
}

export function HoldingsTable({
  title,
  description,
  holdings,
  snapshotComparison,
  onForceRefreshColumn,
  onForceRefreshAll,
  onForceRefreshUrls,
  refreshingColumns,
  refreshingAll,
  refreshingUrls,
}: {
  title?: string;
  description?: string;
  holdings: HoldingData[];
  snapshotComparison?: SnapshotComparisonResponse | null;
  onForceRefreshColumn?: (columnId: MarketColumnId) => void;
  onForceRefreshAll?: () => void;
  onForceRefreshUrls?: () => void;
  refreshingColumns?: ReadonlySet<MarketColumnId>;
  refreshingAll?: boolean;
  refreshingUrls?: boolean;
}) {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    new Set(BASE_COLUMNS.map((c) => c.id))
  );
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [isSortStateLoaded, setIsSortStateLoaded] = useState(false);
  const [sortMenuColumnId, setSortMenuColumnId] = useState<ColumnId | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("none");
  const isMutualFundOnly = holdings.length > 0 && holdings.every((h) => h.security.type === "mutualFund");
  const columns = useMemo(() => getDisplayColumns(isMutualFundOnly), [isMutualFundOnly]);

  const toggleColumn = (id: ColumnId) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleColumns(newSet);
  };

  useEffect(() => {
    setSortState(getStoredSortState());
    setIsSortStateLoaded(true);
    try {
      const saved = window.localStorage.getItem(DIFF_MODE_STORAGE_KEY);
      if (saved === "none" || saved === "prevDay" || saved === "prevMonth") {
        setDiffMode(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isSortStateLoaded) return;
    window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortState));
  }, [isSortStateLoaded, sortState]);

  const selectSort = (columnId: ColumnId, direction: SortDirection) => {
    setSortState({ columnId, direction });
    setSortMenuColumnId(null);
  };

  const changeDiffMode = (mode: DiffMode) => {
    setDiffMode(mode);
    try {
      window.localStorage.setItem(DIFF_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  const data = useMemo(() => {
    const sorted = [...holdings];
    sorted.sort((a, b) => {
      const av = getSortValue(a, sortState.columnId);
      const bv = getSortValue(b, sortState.columnId);
      if (typeof av === "number" && typeof bv === "number") return sortState.direction === "asc" ? av - bv : bv - av;
      if (typeof av === "string" && typeof bv === "string") return sortState.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return 0;
    });
    return sorted;
  }, [holdings, sortState]);

  const refreshingColumnIds = useMemo(
    () => REFRESHABLE_COLUMNS.filter((columnId) => refreshingColumns?.has(columnId)),
    [refreshingColumns]
  );
  const refreshingColumnLabels = useMemo(
    () =>
      refreshingColumnIds.map(
        (columnId) => columns.find((column) => column.id === columnId)?.label ?? columnId
      ),
    [columns, refreshingColumnIds]
  );
  const isAnyRefreshInProgress = Boolean(
    refreshingAll || refreshingUrls || refreshingColumnIds.length > 0
  );
  const refreshStatusText = refreshingAll
    ? "全更新を実行中..."
    : refreshingUrls
      ? "URL更新を実行中..."
      : refreshingColumnLabels.length > 0
        ? `${refreshingColumnLabels.join("・")}を更新中...`
        : null;

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border" aria-busy={isAnyRefreshInProgress}>
      <div className="px-6 py-4 border-b border-border flex justify-between items-start bg-muted/30">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title ?? "保有証券一覧"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {description ?? "保有しているすべての銘柄を表示します"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center bg-muted p-0.5 rounded-lg text-xs" title="表示モード切替">
              {(["none", "prevDay", "prevMonth"] as const).map((mode) => {
                const label = mode === "none" ? "通常" : mode === "prevDay" ? "前日比" : "前月比";
                const hasData =
                  mode === "none" ||
                  (mode === "prevDay" && snapshotComparison?.previousDay != null) ||
                  (mode === "prevMonth" && snapshotComparison?.previousMonth != null);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => changeDiffMode(mode)}
                    disabled={!hasData}
                    title={
                      !hasData
                        ? "比較用スナップショットがありません"
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-md font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      diffMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {onForceRefreshUrls && (
              <button
                type="button"
                onClick={onForceRefreshUrls}
                disabled={isAnyRefreshInProgress}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                title="Yahoo URLの再解決（低頻度用）"
              >
                {refreshingUrls ? "URL更新中..." : "URL更新"}
              </button>
            )}

            {onForceRefreshAll && (
              <button
                onClick={onForceRefreshAll}
                disabled={isAnyRefreshInProgress}
                className="inline-flex items-center px-3 py-2 border border-border shadow-sm text-sm leading-4 font-medium rounded-md text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                {refreshingAll ? "更新中..." : "全更新"}
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                className="inline-flex items-center px-3 py-2 border border-border shadow-sm text-sm leading-4 font-medium rounded-md text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                表示項目
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {isColumnSelectorOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsColumnSelectorOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-20 max-h-96 overflow-y-auto">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {columns.map((col) => (
                        <div key={col.id} className="flex items-center px-4 py-2 hover:bg-muted/50 cursor-pointer" onClick={() => toggleColumn(col.id)}>
                          <input
                            id={`col-${col.id}`}
                            type="checkbox"
                            checked={visibleColumns.has(col.id)}
                            onChange={() => toggleColumn(col.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded accent-primary"
                          />
                          <label htmlFor={`col-${col.id}`} className="ml-3 block text-sm text-foreground cursor-pointer w-full select-none">
                            {col.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {refreshStatusText && (
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {refreshStatusText}
            </p>
          )}
          {diffMode !== "none" && (() => {
            const entry = getComparisonEntry(snapshotComparison, diffMode);
            return entry ? (
              <p className="text-xs text-muted-foreground">
                比較基準: {entry.date}
              </p>
            ) : null;
          })()}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {columns.filter((c) => visibleColumns.has(c.id)).map((column) => (
                <th
                  key={column.id}
                  className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap ${
                    column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                  } ${
                    column.id === "security"
                      ? "sticky left-0 z-30 bg-muted shadow-[inset_-1px_0_0_0_hsl(var(--border))]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-1 group/header">
                    <span>{column.label}</span>
                    <span className="relative">
                      {column.sortable && (
                        <button
                          onClick={() => setSortMenuColumnId(sortMenuColumnId === column.id ? null : column.id)}
                          className={`p-1 rounded hover:bg-muted transition-colors ${
                            sortState.columnId === column.id
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                           {sortState.columnId === column.id ? (
                             sortState.direction === "asc" ? "▲" : "▼"
                           ) : (
                             <span className="opacity-0 group-hover/header:opacity-100">⇅</span>
                           )}
                        </button>
                      )}
                      
                      {sortMenuColumnId === column.id && (
                        <>
                           <div className="fixed inset-0 z-10" onClick={() => setSortMenuColumnId(null)}/>
                           <div className="absolute top-full left-0 mt-1 w-32 rounded-lg bg-popover border border-border shadow-xl ring-1 ring-black/5 z-20 flex flex-col p-1 overflow-hidden">
                             <button
                               onClick={() => selectSort(column.id, "asc")}
                               className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                                sortState.columnId === column.id && sortState.direction === "asc"
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                               }`}
                             >
                               昇順 (A→Z)
                             </button>
                             <button
                               onClick={() => selectSort(column.id, "desc")}
                               className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                                sortState.columnId === column.id && sortState.direction === "desc"
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                               }`}
                             >
                               降順 (Z→A)
                             </button>
                           </div>
                        </>
                      )}

                      {isMarketColumnId(column.id) && onForceRefreshColumn && (
                        <button
                          type="button"
                          onClick={() => onForceRefreshColumn(column.id as MarketColumnId)}
                          disabled={isAnyRefreshInProgress && !refreshingColumns?.has(column.id as MarketColumnId)}
                          className={`text-muted-foreground hover:text-primary disabled:opacity-50 ml-1 transition-opacity ${
                            refreshingColumns?.has(column.id as MarketColumnId)
                              ? "opacity-100 text-primary"
                              : "opacity-0 group-hover/header:opacity-100 focus:opacity-100"
                          }`}
                          title="このカラムだけ再取得"
                        >
                          {refreshingColumns?.has(column.id as MarketColumnId) ? "…" : "↻"}
                        </button>
                      )}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {data.map((h) => {
              const qty = h.totalQuantity?.value ?? h.quantity?.value ?? 0;
              const unit = h.totalQuantity?.unit ?? h.quantity?.unit ?? "shares";
              const avgPrice = h.weightedAveragePrice?.amount ?? h.averagePurchasePrice?.amount ?? 0;
              const curPrice = h.currentPrice?.amount ?? 0;
              const currency = h.security.currency;
              const isMutualFund = h.security.type === "mutualFund"; // type check might need adjustment depending on 'mutual_fund' vs 'mutualFund'
              const divisor = getMutualFundDivisor(h.security.type);
              const totalCost = (qty * avgPrice) / divisor;
              const currentValue = (qty * curPrice) / divisor;
              const displayName = normalizeSecurityNameForDisplay(h.security.name);
              const gainLoss = currentValue - totalCost;
              const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
              const isPositive = gainLoss >= 0;
              const fmt = currency === "JPY" ? formatJPY : formatUSD;
              const isStock = h.security.type === "stock"; // Approximate check for badge color

              const sector = h.sector ?? "-";
              const currentDividendYield = typeof h.dividendYield === "number" ? h.dividendYield : null;
              const dividendAmountDisplay = typeof h.dividendYield === "number" ? fmt((qty * curPrice * h.dividendYield) / divisor) : "-";

              // Diff mode: look up comparison holding
              const comparisonEntry = getComparisonEntry(snapshotComparison, diffMode);
              const prevHolding = comparisonEntry
                ? findComparisonHolding(comparisonEntry, h.security.ticker, h.security.type)
                : null;

              const renderDiffValue = (
                diff: number,
                pct: number,
                fmtFn: (n: number) => string
              ) => {
                const positive = diff >= 0;
                const sign = positive ? "+" : "";
                const colorClass = positive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400";
                return (
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-medium ${colorClass}`}>
                      {sign}{fmtFn(diff)}
                    </span>
                    <span className={`text-xs ${colorClass}`}>
                      ({sign}{pct.toFixed(2)}%)
                    </span>
                  </div>
                );
              };

              const renderCell = (colId: ColumnId) => {
                switch (colId) {
                  case "security":
                    return (
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0 ${
                            isStock
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          }`}
                        >
                          {isStock ? "株" : "信"}
                        </span>
                        <div>
                          {isMutualFund ? (
                            <p className="font-medium text-foreground truncate max-w-[260px]">
                              {displayName}
                            </p>
                          ) : (
                            <>
                              <p className="font-medium text-foreground">{h.security.ticker}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {displayName}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  case "sector": return <span className="text-sm text-muted-foreground">{sector}</span>;
                  case "dividendYield": return <span className="text-sm text-muted-foreground">{currentDividendYield !== null ? `${(currentDividendYield * 100).toFixed(2)}%` : "-"}</span>;
                  case "dividendYieldCost":
                     const yieldCost = (currentDividendYield !== null && avgPrice > 0) ? (curPrice * currentDividendYield) / avgPrice : null;
                     return <span className="text-sm text-muted-foreground">{yieldCost !== null ? `${(yieldCost * 100).toFixed(2)}%` : "-"}</span>;
                  case "quantity": return <span className="text-sm text-foreground">{qty.toLocaleString()} <span className="text-muted-foreground text-xs">{unit === "shares" ? "株" : "口"}</span></span>;
                  case "currentPrice": {
                    if (diffMode !== "none" && prevHolding) {
                      const diff = curPrice - prevHolding.currentPrice;
                      const pct = prevHolding.currentPrice > 0 ? (diff / prevHolding.currentPrice) * 100 : 0;
                      return renderDiffValue(diff, pct, fmt);
                    }
                    if (diffMode !== "none" && !prevHolding) {
                      return <span className="text-sm text-muted-foreground">-</span>;
                    }
                    return <span className="text-sm text-foreground">{fmt(curPrice)}</span>;
                  }
                  case "averagePrice": return <span className="text-sm text-foreground">{fmt(avgPrice)}</span>;
                  case "marketValue": {
                    if (diffMode !== "none" && prevHolding) {
                      const diff = currentValue - prevHolding.marketValue;
                      const pct = prevHolding.marketValue > 0 ? (diff / prevHolding.marketValue) * 100 : 0;
                      return renderDiffValue(diff, pct, fmt);
                    }
                    if (diffMode !== "none" && !prevHolding) {
                      return <span className="text-sm text-muted-foreground">-</span>;
                    }
                    return <span className="text-sm font-medium text-foreground">{fmt(currentValue)}</span>;
                  }
                  case "gainLoss": {
                    if (diffMode !== "none" && prevHolding) {
                      const diff = gainLoss - prevHolding.gainLoss;
                      // % relative to previous market value (how much portfolio value changed)
                      const pct = prevHolding.marketValue > 0 ? (diff / prevHolding.marketValue) * 100 : 0;
                      return renderDiffValue(diff, pct, fmt);
                    }
                    if (diffMode !== "none" && !prevHolding) {
                      return <span className="text-sm text-muted-foreground">-</span>;
                    }
                    return (
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                          {isPositive ? "+" : ""}{fmt(gainLoss)}
                        </span>
                         <span className={`text-xs ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                          ({isPositive ? "+" : ""}{gainLossPercent.toFixed(2)}%)
                         </span>
                      </div>
                    );
                  }
                  case "dividends": return <span className="text-sm text-foreground">{dividendAmountDisplay}</span>;
                  case "yahooLink": {
                    const symbol = encodeURIComponent(h.yahooSymbol ?? h.security.ticker);
                    return <a href={`https://finance.yahoo.co.jp/quote/${symbol}`} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 text-sm hover:underline">Yahoo</a>;
                  }
                  case "googleLink": {
                    const symbol = h.googleSymbol ?? h.security.ticker;
                    let finalSymbol = symbol;
                    if (h.security.currency === "JPY") {
                      if (/^\d{4,5}$/.test(symbol)) {
                        finalSymbol = `${symbol}:TYO`;
                      } else if (symbol.startsWith("TYO:")) {
                        finalSymbol = `${symbol.replace("TYO:", "")}:TYO`;
                      }
                    }
                    return <a href={`https://www.google.com/finance/quote/${finalSymbol}`} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 text-sm hover:underline">Google</a>;
                  }
                  default: return null;
                }
              };

              return (
                <tr
                  key={`${h.security.type}:${h.security.currency}:${h.security.ticker}:${h.security.name}`}
                  className="group hover:bg-muted/50 transition-colors"
                >
                  {columns.filter(c => visibleColumns.has(c.id)).map((column) => (
                     <td key={column.id} className={`px-6 py-4 whitespace-nowrap ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                      } ${
                        column.id === "security"
                          ? "sticky left-0 z-20 bg-card shadow-[inset_-1px_0_0_0_hsl(var(--border))] group-hover:bg-muted"
                          : ""
                      }`}>
                       {renderCell(column.id)}
                     </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
