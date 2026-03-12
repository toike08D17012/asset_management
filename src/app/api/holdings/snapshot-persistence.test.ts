import { describe, expect, it } from "vitest";
import type { IAccountRepository, IHoldingRepository, ISnapshotRepository } from "@/domain/repositories";
import type { AggregatedHolding, Holding } from "@/domain/entities/holding";
import { createSnapshotId, createAccountId, createHoldingId, ok, Brokerage } from "@/domain/types";
import { HoldingsService } from "@/application/holdings-service";
import {
  createSnapshotFromAggregatedHoldings,
  persistSnapshotForAggregatedHoldings,
  type SnapshotSourceHolding,
} from "@/app/api/holdings/snapshot-persistence";

function createHolding(overrides: Partial<Holding>): Holding {
  const now = new Date("2026-03-12T09:00:00.000Z");
  return {
    id: createHoldingId(`holding-${Math.random()}`),
    accountId: createAccountId("account-id"),
    security: {
      ticker: "1234",
      name: "sample",
      type: "stock",
      currency: "JPY",
    },
    quantity: { value: 10, unit: "shares" },
    averagePurchasePrice: { amount: 1000, currency: "JPY" },
    currentPrice: { amount: 1200, currency: "JPY" },
    recordedAt: now,
    ...overrides,
  };
}

async function createAggregatedHoldings(): Promise<AggregatedHolding[]> {
  const holdings: Holding[] = [
    createHolding({
      id: createHoldingId("holding-stock-jpy"),
      accountId: createAccountId("account-jpy"),
      security: {
        ticker: "7203",
        name: "トヨタ自動車",
        type: "stock",
        currency: "JPY",
      },
      quantity: { value: 10, unit: "shares" },
      averagePurchasePrice: { amount: 2500, currency: "JPY" },
      currentPrice: { amount: 3000, currency: "JPY" },
    }),
    createHolding({
      id: createHoldingId("holding-fund-jpy"),
      accountId: createAccountId("account-fund"),
      security: {
        ticker: "eMAXIS",
        name: "eMAXIS Slim",
        type: "mutualFund",
        currency: "JPY",
      },
      quantity: { value: 10000, unit: "units" },
      averagePurchasePrice: { amount: 18000, currency: "JPY" },
      currentPrice: { amount: 20000, currency: "JPY" },
    }),
    createHolding({
      id: createHoldingId("holding-stock-usd"),
      accountId: createAccountId("account-usd"),
      security: {
        ticker: "AAPL",
        name: "Apple",
        type: "stock",
        currency: "USD",
      },
      quantity: { value: 2, unit: "shares" },
      averagePurchasePrice: { amount: 150, currency: "USD" },
      currentPrice: { amount: 210, currency: "USD" },
    }),
  ];

  const holdingRepo: IHoldingRepository = {
    findById: async () => ok(null),
    query: async () => ok(holdings),
    save: async (entity) => ok(entity),
    delete: async () => ok(undefined),
    findByAccountId: async () => ok([]),
    saveMany: async () => ok(undefined),
    deleteByAccountId: async () => ok(undefined),
    deleteAll: async () => ok(undefined),
  };

  const accountRepo: IAccountRepository = {
    findById: async () =>
      ok({
        id: createAccountId("account-id"),
        name: "main",
        brokerage: Brokerage.RAKUTEN,
        encryptedUsername: "enc-user",
        encryptedPassword: "enc-pass",
        createdAt: new Date("2026-03-12T09:00:00.000Z"),
        lastSyncedAt: null,
      }),
    query: async () => ok([]),
    save: async (entity) => ok(entity),
    delete: async () => ok(undefined),
    updateLastSyncedAt: async () => ok(undefined),
  };

  const service = new HoldingsService(holdingRepo, accountRepo);
  const result = await service.aggregateHoldings();
  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

describe("snapshot-persistence", () => {
  it("creates a snapshot with correct per-currency totals", async () => {
    const aggregatedHoldings = await createAggregatedHoldings();
    const enrichedHoldings: SnapshotSourceHolding[] = aggregatedHoldings.map((holding) => ({
      ...holding,
      currentPrice:
        holding.security.ticker === "AAPL"
          ? { ...holding.currentPrice, amount: 200 }
          : holding.security.type === "mutualFund"
            ? { ...holding.currentPrice, amount: 21000 }
            : holding.currentPrice,
    }));

    const snapshotResult = createSnapshotFromAggregatedHoldings(enrichedHoldings);

    expect(snapshotResult.ok).toBe(true);
    if (!snapshotResult.ok) {
      throw snapshotResult.error;
    }

    expect(snapshotResult.value.totalValueJPY).toBe(51000);
    expect(snapshotResult.value.totalValueUSD).toBe(400);
    expect(snapshotResult.value.holdings).toHaveLength(3);

    const fund = snapshotResult.value.holdings.find((holding) => holding.ticker === "eMAXIS");
    expect(fund?.currentPrice).toBe(21000);
  });

  it("persists the generated snapshot", async () => {
    const aggregatedHoldings = await createAggregatedHoldings();
    const enrichedHoldings: SnapshotSourceHolding[] = aggregatedHoldings.map((holding) => ({
      ...holding,
      currentPrice:
        holding.security.ticker === "AAPL"
          ? { ...holding.currentPrice, amount: 200 }
          : holding.currentPrice,
    }));

    const savedSnapshots: string[] = [];
    const snapshotRepo: ISnapshotRepository = {
      save: async (snapshot) => {
        savedSnapshots.push(snapshot.id);
        return ok(snapshot);
      },
      findByPeriod: async () => ok([]),
      findLatest: async () => ok([]),
    };

    const result = await persistSnapshotForAggregatedHoldings(snapshotRepo, enrichedHoldings);

    expect(result.ok).toBe(true);
    expect(savedSnapshots).toHaveLength(1);
  });
});