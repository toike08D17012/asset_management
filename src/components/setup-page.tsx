"use client";

import { useState } from "react";

interface SetupPageProps {
  isFirstTime: boolean;
  onSetupComplete: () => Promise<void> | void;
  onUnlocked: () => Promise<void> | void;
}

export function SetupPage({
  isFirstTime,
  onSetupComplete,
  onUnlocked,
}: SetupPageProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isFirstTime && passphrase !== confirmPassphrase) {
      setError("パスフレーズが一致しません");
      return;
    }

    if (passphrase.length < 8) {
      setError("パスフレーズは8文字以上で入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passphrase,
          action: isFirstTime ? "setup" : "unlock",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }

      // Store unlocked state in sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("encryptionUnlocked", "true");
      }

      // Clear form
      setPassphrase("");
      setConfirmPassphrase("");
      setError("");

      if (isFirstTime) {
        await onSetupComplete();
      } else {
        await onUnlocked();
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isFirstTime ? "資産管理アプリ セットアップ" : "資産管理アプリ"}
            </h1>
            <p className="text-slate-500 mt-2">
              {isFirstTime
                ? "データを保護するパスフレーズを設定してください"
                : "パスフレーズを入力してアンロックしてください"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="passphrase"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                パスフレーズ
              </label>
              <input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                placeholder="8文字以上のパスフレーズ"
                required
                minLength={8}
              />
            </div>

            {isFirstTime && (
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  パスフレーズ（確認）
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  placeholder="もう一度入力してください"
                  required
                  minLength={8}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "処理中..."
                : isFirstTime
                  ? "セットアップ開始"
                  : "アンロック"}
            </button>
          </form>

          {isFirstTime && (
            <p className="text-xs text-slate-400 text-center mt-6">
              このパスフレーズは証券口座の認証情報を暗号化するために使用されます。
              <br />
              忘れた場合、データを復元できません。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
