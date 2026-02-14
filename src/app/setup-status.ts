export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export async function fetchSetupAndUnlockStatus({
  fetcher,
  storage,
}: {
  fetcher: Fetcher;
  storage?: Storage;
}): Promise<{ isSetup: boolean; isUnlocked: boolean }> {
  try {
    const setupRes = await fetcher("/api/setup");
    if (!setupRes.ok) {
      return { isSetup: false, isUnlocked: false };
    }

    const data = await setupRes.json();
    const isSetup = Boolean(data?.setupComplete);

    if (!isSetup) {
      return { isSetup: false, isUnlocked: false };
    }

    const accountsRes = await fetcher("/api/accounts");
    if (accountsRes.ok) {
      storage?.setItem("encryptionUnlocked", "true");
      return { isSetup: true, isUnlocked: true };
    }

    storage?.removeItem("encryptionUnlocked");
    return { isSetup: true, isUnlocked: false };
  } catch {
    return { isSetup: false, isUnlocked: false };
  }
}
