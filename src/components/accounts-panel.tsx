"use client";

import { useEffect, useState } from "react";
import {
  Brokerage,
  brokerageDisplayName,
  Currency,
  QuantityUnit,
  SecurityType,
} from "@/domain/types";
import type { AccountSummary } from "@/types/api";

export function AccountsPanel({
  accounts,
  onRefresh,
}: {
  accounts: AccountSummary[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brokerage: Brokerage.RAKUTEN as string,
    username: "",
    password: "",
  });
  const [manualFormData, setManualFormData] = useState({
    accountId: "",
    ticker: "",
    name: "",
    securityType: SecurityType.STOCK as string,
    currency: Currency.JPY as string,
    quantity: "",
    quantityUnit: QuantityUnit.SHARES as string,
    averagePurchasePrice: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    if (manualFormData.accountId) {
      return;
    }

    const preferred =
      accounts.find((account) => account.brokerage === Brokerage.OTHER)?.id ??
      accounts[0]?.id ??
      "";

    if (preferred) {
      setManualFormData((prev) => ({ ...prev, accountId: preferred }));
    }
  }, [accounts, manualFormData.accountId]);

  function brokerageBadge(brokerage: string): { label: string; className: string } {
    if (brokerage === Brokerage.RAKUTEN) {
      return { label: "楽天", className: "bg-red-500" };
    }
    if (brokerage === Brokerage.SBI) {
      return { label: "SBI", className: "bg-blue-500" };
    }
    return { label: "他", className: "bg-muted-foreground" };
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const payload = {
        ...formData,
        username: formData.brokerage === Brokerage.OTHER ? "" : formData.username,
        password: formData.brokerage === Brokerage.OTHER ? "" : formData.password,
      };

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        setError("サーバーからの応答が不正です");
        return;
      }

      if (!res.ok) {
        // Check if encryption service is not initialized
        if (data.error?.includes("暗号化サービスが初期化されていません") ||
            data.error?.includes("アンロックしてください")) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("encryptionUnlocked");
          }
          setError("セッションが切れました。再度ログインしてください。");
          window.location.reload();
          return;
        }
        setError(data.error || "エラーが発生しました");
        return;
      }

      setShowForm(false);
      setFormData({
        name: "",
        brokerage: Brokerage.RAKUTEN,
        username: "",
        password: "",
      });
      setNotice("口座を追加しました");
      onRefresh();
    } catch (error) {
      console.error("Account creation error:", error);
      setError(`通信エラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddManualHolding(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    const quantity = Number(manualFormData.quantity);
    const averagePurchasePrice = manualFormData.averagePurchasePrice.trim();

    if (!manualFormData.accountId) {
      setError("入力先の証券口座を選択してください");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("数量は0より大きい数値で入力してください");
      return;
    }
    const payload: Record<string, unknown> = {
      accountId: manualFormData.accountId,
      ticker: manualFormData.ticker,
      name: manualFormData.name,
      securityType: manualFormData.securityType,
      currency: manualFormData.currency,
      quantity,
      quantityUnit: manualFormData.quantityUnit,
    };

    if (averagePurchasePrice.length > 0) {
      const avg = Number(averagePurchasePrice);
      if (!Number.isFinite(avg) || avg < 0) {
        setError("平均取得価格は0以上の数値で入力してください");
        return;
      }
      payload.averagePurchasePrice = avg;
    }

    setManualLoading(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "保有銘柄の追加に失敗しました");
        return;
      }

      setManualFormData((prev) => ({
        ...prev,
        ticker: "",
        name: "",
        quantity: "",
        averagePurchasePrice: "",
      }));
      setNotice("保有銘柄を追加しました");
      onRefresh();
    } catch {
      setError("保有銘柄の追加に失敗しました");
    } finally {
      setManualLoading(false);
    }
  }

  async function handleDeleteAccount(id: string) {
    setError("");
    setNotice("");
    if (!confirm("このアカウントを削除しますか？関連する保有証券データも削除されます。")) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "削除に失敗しました");
        return;
      }
      setNotice("口座を削除しました");
      onRefresh();
    } catch {
      setError("削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">証券口座一覧</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg transition hover:opacity-90"
        >
          {showForm ? "キャンセル" : "+ 口座を追加"}
        </button>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {/* Add Account Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-md font-semibold text-foreground mb-4">
            新しい証券口座を追加
          </h3>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  口座名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="例: 楽天証券 メイン口座"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  証券会社
                </label>
                <select
                  value={formData.brokerage}
                  onChange={(e) =>
                    setFormData({ ...formData, brokerage: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value={Brokerage.RAKUTEN}>
                    {brokerageDisplayName(Brokerage.RAKUTEN)}
                  </option>
                  <option value={Brokerage.SBI}>
                    {brokerageDisplayName(Brokerage.SBI)}
                  </option>
                  <option value={Brokerage.OTHER}>
                    {brokerageDisplayName(Brokerage.OTHER)}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ログインID
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  required={formData.brokerage !== Brokerage.OTHER}
                  disabled={formData.brokerage === Brokerage.OTHER}
                  placeholder={
                    formData.brokerage === Brokerage.OTHER
                      ? "その他口座では不要"
                      : "ログインIDを入力"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  required={formData.brokerage !== Brokerage.OTHER}
                  disabled={formData.brokerage === Brokerage.OTHER}
                  placeholder={
                    formData.brokerage === Brokerage.OTHER
                      ? "その他口座では不要"
                      : "パスワードを入力"
                  }
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "追加中..." : "追加"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account List */}
      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground">
            登録されている証券口座がありません
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            「+ 口座を追加」から証券口座を登録してください
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => {
            const badge = brokerageBadge(account.brokerage);
            return (
              <div key={account.id} className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {account.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {brokerageDisplayName(account.brokerage)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="text-muted-foreground hover:text-destructive transition"
                    title="削除"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>
                    作成日:{" "}
                    {new Date(account.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  {account.lastSyncedAt && (
                    <p>
                      最終同期:{" "}
                      {new Date(account.lastSyncedAt).toLocaleString("ja-JP")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-md font-semibold text-foreground mb-4">保有銘柄を手動入力</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            手動入力を行うには、先に証券口座を作成してください。
          </p>
        ) : (
          <form onSubmit={handleAddManualHolding} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">入力先口座</label>
                <select
                  value={manualFormData.accountId}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, accountId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({brokerageDisplayName(account.brokerage)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">銘柄種別</label>
                <select
                  value={manualFormData.securityType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setManualFormData((prev) => ({
                      ...prev,
                      securityType: nextType,
                      quantityUnit:
                        nextType === SecurityType.MUTUAL_FUND
                          ? QuantityUnit.UNITS
                          : QuantityUnit.SHARES,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value={SecurityType.STOCK}>株式</option>
                  <option value={SecurityType.MUTUAL_FUND}>投資信託</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">銘柄コード</label>
                <input
                  type="text"
                  value={manualFormData.ticker}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, ticker: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="例: 7203 / AAPL / 8931123C"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">銘柄名</label>
                <input
                  type="text"
                  value={manualFormData.name}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="例: トヨタ自動車"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">通貨</label>
                <select
                  value={manualFormData.currency}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, currency: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value={Currency.JPY}>JPY</option>
                  <option value={Currency.USD}>USD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">数量単位</label>
                <select
                  value={manualFormData.quantityUnit}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, quantityUnit: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value={QuantityUnit.SHARES}>株</option>
                  <option value={QuantityUnit.UNITS}>口</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">数量</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={manualFormData.quantity}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  平均取得価格（任意）
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={manualFormData.averagePurchasePrice}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, averagePurchasePrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="未入力時は現在値（自動取得）を使用"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={manualLoading}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition hover:opacity-90 disabled:opacity-50"
              >
                {manualLoading ? "追加中..." : "保有銘柄を追加"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
