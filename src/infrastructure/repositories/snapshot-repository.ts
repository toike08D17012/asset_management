// ============================================================
// Snapshot Repository
// REQ-013: 履歴保存
// ============================================================

import { getDb } from "@/infrastructure/database/connection";
import { snapshots } from "@/infrastructure/database/schema";
import type { Snapshot, SnapshotHolding } from "@/domain/entities/snapshot";
import {
  type SnapshotId,
  type Result,
  createSnapshotId,
  ok,
  err,
} from "@/domain/types";
import type { ISnapshotRepository } from "@/domain/repositories";
import { toErrorMessage } from "@/lib/errors";
import { desc, gte, lte, and } from "drizzle-orm";

function rowToSnapshot(row: typeof snapshots.$inferSelect): Snapshot {
  return {
    id: createSnapshotId(row.id),
    timestamp: new Date(row.timestamp),
    totalValueJPY: row.totalValueJPY,
    totalValueUSD: row.totalValueUSD,
    holdings: JSON.parse(row.holdingsData) as SnapshotHolding[],
  };
}

export class SnapshotRepository implements ISnapshotRepository {
  async save(snapshot: Snapshot): Promise<Result<Snapshot>> {
    try {
      const db = getDb();
      await db.insert(snapshots).values({
        id: snapshot.id,
        timestamp: snapshot.timestamp.toISOString(),
        totalValueJPY: snapshot.totalValueJPY,
        totalValueUSD: snapshot.totalValueUSD,
        holdingsData: JSON.stringify(snapshot.holdings),
      });
      return ok(snapshot);
    } catch (error) {
      return err(
        new Error(
          `Failed to save snapshot: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async findByPeriod(start: Date, end: Date): Promise<Result<Snapshot[]>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(snapshots)
        .where(
          and(
            gte(snapshots.timestamp, start.toISOString()),
            lte(snapshots.timestamp, end.toISOString())
          )
        )
        .orderBy(desc(snapshots.timestamp));

      return ok(rows.map(rowToSnapshot));
    } catch (error) {
      return err(
        new Error(
          `Failed to find snapshots: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async findLatest(count: number = 30): Promise<Result<Snapshot[]>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(snapshots)
        .orderBy(desc(snapshots.timestamp))
        .limit(count);

      return ok(rows.map(rowToSnapshot));
    } catch (error) {
      return err(
        new Error(
          `Failed to find latest snapshots: ${toErrorMessage(error)}`
        )
      );
    }
  }
}
