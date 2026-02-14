import { describe, it, expect, vi } from "vitest";
import { fetchSetupAndUnlockStatus } from "./setup-status";

describe("fetchSetupAndUnlockStatus", () => {
  it("returns unlocked when setup complete and accounts OK", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ setupComplete: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accounts: [] }), { status: 200 })
      );

    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const result = await fetchSetupAndUnlockStatus({ fetcher, storage });

    expect(result).toEqual({ isSetup: true, isUnlocked: true });
    expect(storage.setItem).toHaveBeenCalledWith("encryptionUnlocked", "true");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("returns locked and clears storage when accounts API fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ setupComplete: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "locked" }), { status: 500 })
      );

    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const result = await fetchSetupAndUnlockStatus({ fetcher, storage });

    expect(result).toEqual({ isSetup: true, isUnlocked: false });
    expect(storage.removeItem).toHaveBeenCalledWith("encryptionUnlocked");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("returns not setup when setup API fails", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("network"));

    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const result = await fetchSetupAndUnlockStatus({ fetcher, storage });

    expect(result).toEqual({ isSetup: false, isUnlocked: false });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
