"use client";

import { useState } from "react";
import { Brokerage, brokerageDisplayName } from "@/domain/types";
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
                  required
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
                  required
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
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-card rounded-xl border border-border shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                      account.brokerage === "rakuten"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                  >
                    {account.brokerage === "rakuten" ? "楽天" : "SBI"}
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
          ))}
        </div>
      )}
    </div>
  );
}
