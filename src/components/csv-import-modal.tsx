"use client";

import { useEffect, useState } from "react";
import Encoding from "encoding-japanese";
import type { AccountSummary } from "@/types/api";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function CSVImportModal({
  accounts,
  onClose,
  onImportComplete,
}: {
  accounts: AccountSummary[];
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const [selectedAccount, setSelectedAccount] = useState(
    accounts.length > 0 ? accounts[0].id : ""
  );
  const [csvContent, setCSVContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("ファイルサイズが大きすぎます（2MB以下）");
      return;
    }

    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;

      // ArrayBufferをUint8Arrayに変換
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // エンコーディングを自動検出してUTF-8に変換
      const detectedEncoding = Encoding.detect(uint8Array);
      const unicodeArray = Encoding.convert(uint8Array, {
        to: 'UNICODE',
        from: detectedEncoding || 'SJIS' // 検出失敗時はShift-JISを使用
      });
      
      // UTF-8文字列に変換
      const utf8String = Encoding.codeToString(unicodeArray);
      setCSVContent(utf8String);
    };
    reader.readAsArrayBuffer(file); // ArrayBufferとして読み込み
  }

  async function handleClearData() {
    if (!confirm("全ての保有証券データを削除しますか？この操作は取り消せません。")) {
      return;
    }

    setClearLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/holdings/clear", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "削除に失敗しました");
        return;
      }

      setSuccess(data.message);
      setTimeout(() => {
        onImportComplete();
      }, 1000);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setClearLoading(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedAccount) {
      setError("インポート先の証券口座を選択してください");
      return;
    }

    if (!csvContent.trim()) {
      setError("CSVデータを入力またはファイルをアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/holdings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          csvContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "インポートに失敗しました");
        return;
      }

      setSuccess(data.message);
      setTimeout(() => {
        onImportComplete();
      }, 1500);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            CSVインポート
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleImport} className="p-6 space-y-4">
          {accounts.length === 0 ? (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm">
              先に証券口座を登録してください。「証券口座」タブから口座を追加できます。
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  インポート先の証券口座
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.brokerage === "rakuten" ? "楽天証券" : "SBI証券"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  CSVファイル
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  または直接CSVデータを貼り付け
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCSVContent(e.target.value)}
                  className="w-full px-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-ring font-mono text-sm"
                  rows={8}
                  placeholder="または、CSVファイルの内容を直接貼り付け"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">
                  楽天証券の場合
                </p>
                <p className="text-xs text-muted-foreground">
                  マイメニュー → 資産状況 → 保有資産一覧 → 「資産残高（合計）」のCSVダウンロード
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ※ ファイルは自動的にShift-JISから変換されます
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClearData}
                  disabled={clearLoading}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearLoading ? "削除中..." : "全データ削除"}
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !csvContent.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "インポート中..." : "インポート実行"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
