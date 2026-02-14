// ============================================================
// Account Repository
// REQ-010: アカウントCRUD
// ============================================================

import { eq } from "drizzle-orm";
import { getDb } from "@/infrastructure/database/connection";
import { accounts } from "@/infrastructure/database/schema";
import type { Account } from "@/domain/entities/account";
import {
  type AccountId,
  type Brokerage,
  type Result,
  createAccountId,
  ok,
  err,
} from "@/domain/types";
import type { IAccountRepository } from "@/domain/repositories";
import { toErrorMessage } from "@/lib/errors";

function rowToAccount(row: typeof accounts.$inferSelect): Account {
  return {
    id: createAccountId(row.id),
    name: row.name,
    brokerage: row.brokerage as Brokerage,
    encryptedUsername: row.encryptedUsername,
    encryptedPassword: row.encryptedPassword,
    createdAt: new Date(row.createdAt),
    lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : null,
  };
}

export class AccountRepository implements IAccountRepository {
  async findById(id: string): Promise<Result<Account | null>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, id))
        .limit(1);

      if (rows.length === 0) return ok(null);
      return ok(rowToAccount(rows[0]));
    } catch (error) {
      return err(
        new Error(
          `Failed to find account: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async query(): Promise<Result<Account[]>> {
    try {
      const db = getDb();
      const rows = await db.select().from(accounts);
      return ok(rows.map(rowToAccount));
    } catch (error) {
      return err(
        new Error(
          `Failed to query accounts: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async save(account: Account): Promise<Result<Account>> {
    try {
      const db = getDb();
      await db
        .insert(accounts)
        .values({
          id: account.id,
          name: account.name,
          brokerage: account.brokerage,
          encryptedUsername: account.encryptedUsername,
          encryptedPassword: account.encryptedPassword,
          createdAt: account.createdAt.toISOString(),
          lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
        })
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            name: account.name,
            brokerage: account.brokerage,
            encryptedUsername: account.encryptedUsername,
            encryptedPassword: account.encryptedPassword,
            lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
          },
        });

      return ok(account);
    } catch (error) {
      return err(
        new Error(
          `Failed to save account: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const db = getDb();
      await db.delete(accounts).where(eq(accounts.id, id));
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete account: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async updateLastSyncedAt(id: AccountId): Promise<Result<void>> {
    try {
      const db = getDb();
      await db
        .update(accounts)
        .set({ lastSyncedAt: new Date().toISOString() })
        .where(eq(accounts.id, id));
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to update last synced at: ${toErrorMessage(error)}`
        )
      );
    }
  }
}
