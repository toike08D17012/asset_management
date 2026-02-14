"use client";

import { useEffect, useState } from "react";
import { SetupPage } from "@/components/setup-page";
import { Dashboard } from "@/components/dashboard";
import { fetchSetupAndUnlockStatus } from "@/app/setup-status";

export default function Home() {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupAndUnlockStatus();
  }, []);

  async function checkSetupAndUnlockStatus() {
    try {
      const storage = typeof window !== "undefined" ? sessionStorage : undefined;
      const status = await fetchSetupAndUnlockStatus({
        fetcher: fetch,
        storage,
      });
      setIsSetup(status.isSetup);
      setIsUnlocked(status.isUnlocked);
    } catch (e) {
      console.error("Failed to check setup status", e);
      setIsSetup(false);
      setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupComplete() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("encryptionUnlocked", "true");
    }
    setIsSetup(true);
    setIsUnlocked(true);
  }

  async function handleUnlocked() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("encryptionUnlocked", "true");
    }
    setIsUnlocked(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isSetup || !isUnlocked) {
    return (
      <SetupPage
        isFirstTime={!isSetup}
        onSetupComplete={handleSetupComplete}
        onUnlocked={handleUnlocked}
      />
    );
  }

  return <Dashboard />;
}
