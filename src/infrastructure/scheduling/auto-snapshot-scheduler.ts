// ============================================================
// Auto Snapshot Scheduler
// REQ-006: 自動同期, REQ-013: 履歴保存, REQ-014: トレンドグラフ
// ============================================================

import "server-only";

import { getHoldingsService, getSnapshotRepository } from "@/lib/service-container";
import { type Result, ok, err } from "@/domain/types";
import { enrichHoldingsWithDataSource } from "@/infrastructure/market-data/enrich-holdings";
import { isJapanesePublicHoliday } from "@/infrastructure/scheduling/japanese-holidays";
import {
  persistSnapshotForAggregatedHoldings,
  type SnapshotSourceHolding,
} from "@/app/api/holdings/snapshot-persistence";

type SchedulerState = {
  timer: NodeJS.Timeout | null;
  running: boolean;
  lastRunDateKey: string | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

export interface AutoSnapshotConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  timezone: string;
  pollIntervalMs: number;
  weekdaysOnly: boolean;
  excludeJapaneseHolidays: boolean;
}

export interface AutoSnapshotDependencies {
  aggregateHoldings: () => Promise<Result<SnapshotSourceHolding[]>>;
  persistSnapshot: (holdings: SnapshotSourceHolding[]) => Promise<Result<void>>;
  now: () => Date;
  logInfo: (message: string) => void;
  logError: (message: string) => void;
}

function getSchedulerState(): SchedulerState {
  const globalKey = "__assetManagementAutoSnapshotScheduler";
  const scopedGlobal = globalThis as typeof globalThis & {
    [globalKey]?: SchedulerState;
  };

  if (!scopedGlobal[globalKey]) {
    scopedGlobal[globalKey] = {
      timer: null,
      running: false,
      lastRunDateKey: null,
    };
  }

  return scopedGlobal[globalKey];
}

export function getDefaultAutoSnapshotConfig(): AutoSnapshotConfig {
  return {
    enabled: process.env.AUTO_SNAPSHOT_ENABLED === "true",
    hour: Number.parseInt(process.env.AUTO_SNAPSHOT_HOUR ?? "16", 10),
    minute: Number.parseInt(process.env.AUTO_SNAPSHOT_MINUTE ?? "10", 10),
    timezone: process.env.AUTO_SNAPSHOT_TIMEZONE ?? "Asia/Tokyo",
    pollIntervalMs: Number.parseInt(process.env.AUTO_SNAPSHOT_POLL_MS ?? "60000", 10),
    weekdaysOnly: process.env.AUTO_SNAPSHOT_WEEKDAYS_ONLY !== "false",
    excludeJapaneseHolidays: process.env.AUTO_SNAPSHOT_EXCLUDE_JP_HOLIDAYS !== "false",
  };
}

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number.parseInt(read("year"), 10),
    month: Number.parseInt(read("month"), 10),
    day: Number.parseInt(read("day"), 10),
    hour: Number.parseInt(read("hour"), 10),
    minute: Number.parseInt(read("minute"), 10),
    weekday: weekdayMap[read("weekday")] ?? 0,
  };
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function shouldRunAutoSnapshot(
  now: Date,
  lastRunDateKey: string | null,
  config: AutoSnapshotConfig,
): boolean {
  if (!config.enabled) return false;

  const parts = getDatePartsInTimeZone(now, config.timezone);
  const dateKey = getDateKeyInTimeZone(now, config.timezone);

  if (config.weekdaysOnly && (parts.weekday === 0 || parts.weekday === 6)) {
    return false;
  }

  if (
    config.excludeJapaneseHolidays &&
    isJapanesePublicHoliday(parts.year, parts.month, parts.day)
  ) {
    return false;
  }

  if (lastRunDateKey === dateKey) {
    return false;
  }

  if (parts.hour < config.hour) {
    return false;
  }

  if (parts.hour === config.hour && parts.minute < config.minute) {
    return false;
  }

  return true;
}

export async function runAutoSnapshotOnce(
  deps: AutoSnapshotDependencies,
  config: AutoSnapshotConfig,
  state: SchedulerState = getSchedulerState(),
): Promise<Result<void>> {
  const now = deps.now();
  const dateKey = getDateKeyInTimeZone(now, config.timezone);

  if (!shouldRunAutoSnapshot(now, state.lastRunDateKey, config)) {
    return ok(undefined);
  }

  if (state.running) {
    return ok(undefined);
  }

  state.running = true;

  try {
    deps.logInfo(`Running auto snapshot for ${dateKey}`);

    const holdingsResult = await deps.aggregateHoldings();
    if (!holdingsResult.ok) {
      deps.logError(`Failed to aggregate holdings for auto snapshot: ${holdingsResult.error.message}`);
      return err(holdingsResult.error);
    }

    const persistResult = await deps.persistSnapshot(holdingsResult.value);
    if (!persistResult.ok) {
      deps.logError(`Failed to persist auto snapshot: ${persistResult.error.message}`);
      return err(persistResult.error);
    }

    state.lastRunDateKey = dateKey;
    deps.logInfo(`Auto snapshot completed for ${dateKey}`);
    return ok(undefined);
  } finally {
    state.running = false;
  }
}

function createDefaultDependencies(): AutoSnapshotDependencies {
  return {
    aggregateHoldings: async () => {
      const holdingsServiceResult = getHoldingsService();
      if (!holdingsServiceResult.ok) {
        return err(holdingsServiceResult.error);
      }

      const aggregatedResult = await holdingsServiceResult.value.aggregateHoldings();
      if (!aggregatedResult.ok) {
        return err(aggregatedResult.error);
      }

      const holdings = await enrichHoldingsWithDataSource(
        aggregatedResult.value,
        "live",
        true,
        false,
      );

      return ok(holdings as SnapshotSourceHolding[]);
    },
    persistSnapshot: async (holdings) => {
      const snapshotRepositoryResult = getSnapshotRepository();
      if (!snapshotRepositoryResult.ok) {
        return err(snapshotRepositoryResult.error);
      }

      return persistSnapshotForAggregatedHoldings(snapshotRepositoryResult.value, holdings);
    },
    now: () => new Date(),
    logInfo: (message) => console.info(`[auto-snapshot] ${message}`),
    logError: (message) => console.error(`[auto-snapshot] ${message}`),
  };
}

export function startAutoSnapshotScheduler(
  config: AutoSnapshotConfig = getDefaultAutoSnapshotConfig(),
  deps: AutoSnapshotDependencies = createDefaultDependencies(),
): void {
  const state = getSchedulerState();

  if (!config.enabled || state.timer) {
    return;
  }

  state.timer = setInterval(() => {
    void runAutoSnapshotOnce(deps, config, state);
  }, config.pollIntervalMs);

  void runAutoSnapshotOnce(deps, config, state);
}