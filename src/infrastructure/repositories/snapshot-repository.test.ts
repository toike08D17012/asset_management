import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "@/domain/entities/snapshot";
import { createSnapshotId, ok } from "@/domain/types";
import { SnapshotRepository } from "@/infrastructure/repositories/snapshot-repository";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/infrastructure/database/connection", () => ({
  getDb: getDbMock,
}));

function createSnapshot(timestamp: string): Snapshot {
  return {
    id: createSnapshotId("new-snapshot-id"),
    timestamp: new Date(timestamp),
    totalValueJPY: 1000,
    totalValueUSD: 200,
    holdings: [
      {
        ticker: "7203",
        name: "トヨタ自動車",
        securityType: "stock",
        currency: "JPY",
        quantity: 10,
        quantityUnit: "shares",
        averagePurchasePrice: 2500,
        currentPrice: 3000,
        accountId: "account-1",
      },
    ],
  };
}

function createRow(id: string, timestamp: string) {
  return {
    id,
    timestamp,
    totalValueJPY: 900,
    totalValueUSD: 100,
    holdingsData: "[]",
  };
}

function createDb(existingRows: Array<ReturnType<typeof createRow>>) {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const deleteWhere = vi.fn().mockResolvedValue(undefined);

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue(existingRows),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };

  return { db, insertValues, updateSet, updateWhere, deleteWhere };
}

describe("SnapshotRepository", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("inserts a new snapshot when the day has no existing snapshot", async () => {
    const { db, insertValues, updateSet, deleteWhere } = createDb([]);
    getDbMock.mockReturnValue(db);

    const repository = new SnapshotRepository();
    const snapshot = createSnapshot("2026-03-12T15:00:00.000+09:00");

    const result = await repository.save(snapshot);

    expect(result).toEqual(ok(snapshot));
    expect(insertValues).toHaveBeenCalledOnce();
    expect(updateSet).not.toHaveBeenCalled();
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it("updates the latest snapshot when the same local day already exists", async () => {
    const { db, insertValues, updateSet, updateWhere, deleteWhere } = createDb([
      createRow("existing-id", "2026-03-12T08:00:00.000Z"),
      createRow("duplicate-id", "2026-03-12T01:00:00.000Z"),
    ]);
    getDbMock.mockReturnValue(db);

    const repository = new SnapshotRepository();
    const snapshot = createSnapshot("2026-03-12T18:30:00.000+09:00");

    const result = await repository.save(snapshot);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    expect(result.value.id).toBe(createSnapshotId("existing-id"));
    expect(insertValues).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledOnce();
    expect(updateWhere).toHaveBeenCalledOnce();
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});