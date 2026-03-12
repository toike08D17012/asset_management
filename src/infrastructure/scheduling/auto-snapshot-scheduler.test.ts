import { describe, expect, it, vi } from "vitest";
import { err, ok } from "@/domain/types";

vi.mock("server-only", () => ({}));

import {
  getDefaultAutoSnapshotConfig,
  runAutoSnapshotOnce,
  shouldRunAutoSnapshot,
  type AutoSnapshotConfig,
} from "@/infrastructure/scheduling/auto-snapshot-scheduler";

const baseConfig: AutoSnapshotConfig = {
  enabled: true,
  hour: 16,
  minute: 10,
  timezone: "Asia/Tokyo",
  pollIntervalMs: 60_000,
  weekdaysOnly: true,
  excludeJapaneseHolidays: true,
};

describe("auto-snapshot-scheduler", () => {
  it("runs after the configured weekday time in Tokyo", () => {
    const now = new Date("2026-03-13T07:10:00.000Z");
    expect(shouldRunAutoSnapshot(now, null, baseConfig)).toBe(true);
  });

  it("does not run before the configured time", () => {
    const now = new Date("2026-03-13T07:09:00.000Z");
    expect(shouldRunAutoSnapshot(now, null, baseConfig)).toBe(false);
  });

  it("does not run on Japanese public holidays", () => {
    const now = new Date("2026-02-11T07:10:00.000Z");
    expect(shouldRunAutoSnapshot(now, null, baseConfig)).toBe(false);
  });

  it("does not run on substitute holidays", () => {
    const now = new Date("2026-05-06T07:10:00.000Z");
    expect(shouldRunAutoSnapshot(now, null, baseConfig)).toBe(false);
  });

  it("does not run twice on the same day", async () => {
    const aggregateHoldings = vi.fn().mockResolvedValue(ok([]));
    const persistSnapshot = vi.fn().mockResolvedValue(ok(undefined));
    const state = {
      timer: null,
      running: false,
      lastRunDateKey: null,
    };
    const now = new Date("2026-03-13T07:10:00.000Z");

    await runAutoSnapshotOnce(
      {
        aggregateHoldings,
        persistSnapshot,
        now: () => now,
        logInfo: vi.fn(),
        logError: vi.fn(),
      },
      baseConfig,
      state,
    );

    await runAutoSnapshotOnce(
      {
        aggregateHoldings,
        persistSnapshot,
        now: () => now,
        logInfo: vi.fn(),
        logError: vi.fn(),
      },
      baseConfig,
      state,
    );

    expect(aggregateHoldings).toHaveBeenCalledOnce();
    expect(persistSnapshot).toHaveBeenCalledOnce();
  });

  it("returns error when aggregation fails", async () => {
    const aggregateHoldings = vi.fn().mockResolvedValue(err(new Error("aggregate failed")));
    const persistSnapshot = vi.fn().mockResolvedValue(ok(undefined));
    const logError = vi.fn();

    const result = await runAutoSnapshotOnce(
      {
        aggregateHoldings,
        persistSnapshot,
        now: () => new Date("2026-03-13T07:10:00.000Z"),
        logInfo: vi.fn(),
        logError,
      },
      baseConfig,
      {
        timer: null,
        running: false,
        lastRunDateKey: null,
      },
    );

    expect(result.ok).toBe(false);
    expect(logError).toHaveBeenCalledOnce();
    expect(persistSnapshot).not.toHaveBeenCalled();
  });

  it("reads defaults from environment", () => {
    vi.stubEnv("AUTO_SNAPSHOT_ENABLED", "true");
    vi.stubEnv("AUTO_SNAPSHOT_HOUR", "16");
    vi.stubEnv("AUTO_SNAPSHOT_MINUTE", "5");
    vi.stubEnv("AUTO_SNAPSHOT_TIMEZONE", "Asia/Tokyo");
    vi.stubEnv("AUTO_SNAPSHOT_POLL_MS", "30000");
    vi.stubEnv("AUTO_SNAPSHOT_WEEKDAYS_ONLY", "true");

    const config = getDefaultAutoSnapshotConfig();

    expect(config).toEqual({
      enabled: true,
      hour: 16,
      minute: 5,
      timezone: "Asia/Tokyo",
      pollIntervalMs: 30000,
      weekdaysOnly: true,
      excludeJapaneseHolidays: true,
    });

    vi.unstubAllEnvs();
  });
});