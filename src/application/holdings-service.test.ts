import { describe, expect, it } from "vitest";
import { HoldingsService } from "@/application/holdings-service";
import type { IAccountRepository, IHoldingRepository } from "@/domain/repositories";
import type { Holding } from "@/domain/entities/holding";
import { Brokerage, createAccountId, createHoldingId, ok } from "@/domain/types";

function createHolding(overrides: Partial<Holding>): Holding {
  const now = new Date();
  return {
    id: createHoldingId("holding-id"),
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

describe("HoldingsService", () => {
  it("aggregates holdings by ticker+currency+securityType", async () => {
    const holdings: Holding[] = [
      createHolding({
        id: createHoldingId("holding-stock"),
        security: {
          ticker: "1234",
          name: "stock",
          type: "stock",
          currency: "JPY",
        },
      }),
      createHolding({
        id: createHoldingId("holding-fund"),
        quantity: { value: 10000, unit: "units" },
        security: {
          ticker: "1234",
          name: "fund",
          type: "mutualFund",
          currency: "JPY",
        },
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
          createdAt: new Date(),
          lastSyncedAt: null,
        }),
      query: async () => ok([]),
      save: async (entity) => ok(entity),
      delete: async () => ok(undefined),
      updateLastSyncedAt: async () => ok(undefined),
    };

    const service = new HoldingsService(holdingRepo, accountRepo);
    const result = await service.aggregateHoldings();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value.map((item) => item.security.type).sort()).toEqual([
        "mutualFund",
        "stock",
      ]);
    }
  });

  it("adds manual holding and defaults averagePurchasePrice to currentPrice when omitted", async () => {
    const state: { savedHolding: Holding | null } = { savedHolding: null };

    const holdingRepo: IHoldingRepository = {
      findById: async () => ok(null),
      query: async () => ok([]),
      save: async (entity) => {
        state.savedHolding = entity;
        return ok(entity);
      },
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
          name: "manual",
          brokerage: Brokerage.OTHER,
          encryptedUsername: "enc-user",
          encryptedPassword: "enc-pass",
          createdAt: new Date(),
          lastSyncedAt: null,
        }),
      query: async () => ok([]),
      save: async (entity) => ok(entity),
      delete: async () => ok(undefined),
      updateLastSyncedAt: async () => ok(undefined),
    };

    const service = new HoldingsService(holdingRepo, accountRepo);
    const result = await service.addManualHolding({
      accountId: "account-id",
      ticker: "7203",
      name: "トヨタ自動車",
      securityType: "stock",
      currency: "JPY",
      quantity: 10,
      quantityUnit: "shares",
      currentPrice: 3000,
    });

    expect(result.ok).toBe(true);
    expect(state.savedHolding).not.toBeNull();
    if (!state.savedHolding) {
      throw new Error("savedHolding should not be null");
    }
    expect(state.savedHolding.averagePurchasePrice.amount).toBe(3000);
  });
});
