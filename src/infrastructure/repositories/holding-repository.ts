// ============================================================
// Holding Repository
// REQ-002: 保有証券データ保存
// ============================================================

import { eq } from "drizzle-orm";
import { getDb } from "@/infrastructure/database/connection";
import { holdings } from "@/infrastructure/database/schema";
import type { Holding } from "@/domain/entities/holding";
import {
  type AccountId,
  type HoldingId,
  type Currency,
  type SecurityType,
  type QuantityUnit,
  type Result,
  createHoldingId,
  createAccountId,
  ok,
  err,
} from "@/domain/types";
import type { IHoldingRepository } from "@/domain/repositories";
import { toErrorMessage } from "@/lib/errors";

function rowToHolding(row: typeof holdings.$inferSelect): Holding {
  return {
    id: createHoldingId(row.id),
    accountId: createAccountId(row.accountId),
    security: {
      ticker: row.ticker,
      name: row.name,
      type: row.securityType as SecurityType,
      currency: row.currency as Currency,
    },
    quantity: {
      value: row.quantity,
      unit: row.quantityUnit as QuantityUnit,
    },
    averagePurchasePrice: {
      amount: row.averagePurchasePrice,
      currency: row.currency as Currency,
    },
    currentPrice: {
      amount: row.currentPrice,
      currency: row.currency as Currency,
    },
    recordedAt: new Date(row.recordedAt),
  };
}

export class HoldingRepository implements IHoldingRepository {
  async findById(id: string): Promise<Result<Holding | null>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(holdings)
        .where(eq(holdings.id, id))
        .limit(1);

      if (rows.length === 0) return ok(null);
      return ok(rowToHolding(rows[0]));
    } catch (error) {
      return err(
        new Error(
          `Failed to find holding: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async query(): Promise<Result<Holding[]>> {
    try {
      const db = getDb();
      const rows = await db.select().from(holdings);
      return ok(rows.map(rowToHolding));
    } catch (error) {
      return err(
        new Error(
          `Failed to query holdings: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async findByAccountId(accountId: AccountId): Promise<Result<Holding[]>> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(holdings)
        .where(eq(holdings.accountId, accountId));
      return ok(rows.map(rowToHolding));
    } catch (error) {
      return err(
        new Error(
          `Failed to find holdings by account: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async save(holding: Holding): Promise<Result<Holding>> {
    try {
      const db = getDb();
      await db
        .insert(holdings)
        .values({
          id: holding.id,
          accountId: holding.accountId,
          ticker: holding.security.ticker,
          name: holding.security.name,
          securityType: holding.security.type,
          currency: holding.security.currency,
          quantity: holding.quantity.value,
          quantityUnit: holding.quantity.unit,
          averagePurchasePrice: holding.averagePurchasePrice.amount,
          currentPrice: holding.currentPrice.amount,
          recordedAt: holding.recordedAt.toISOString(),
        })
        .onConflictDoUpdate({
          target: holdings.id,
          set: {
            ticker: holding.security.ticker,
            name: holding.security.name,
            securityType: holding.security.type,
            currency: holding.security.currency,
            quantity: holding.quantity.value,
            quantityUnit: holding.quantity.unit,
            averagePurchasePrice: holding.averagePurchasePrice.amount,
            currentPrice: holding.currentPrice.amount,
            recordedAt: holding.recordedAt.toISOString(),
          },
        });

      return ok(holding);
    } catch (error) {
      return err(
        new Error(
          `Failed to save holding: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async saveMany(holdingsList: Holding[]): Promise<Result<void>> {
    try {
      if (holdingsList.length === 0) return ok(undefined);

      const db = getDb();
      const values = holdingsList.map((holding) => ({
        id: holding.id,
        accountId: holding.accountId,
        ticker: holding.security.ticker,
        name: holding.security.name,
        securityType: holding.security.type,
        currency: holding.security.currency,
        quantity: holding.quantity.value,
        quantityUnit: holding.quantity.unit,
        averagePurchasePrice: holding.averagePurchasePrice.amount,
        currentPrice: holding.currentPrice.amount,
        recordedAt: holding.recordedAt.toISOString(),
      }));

      await db.insert(holdings).values(values);

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to save holdings: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const db = getDb();
      await db.delete(holdings).where(eq(holdings.id, id));
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete holding: ${toErrorMessage(error)}`
        )
      );
    }
  }

  async deleteByAccountId(accountId: AccountId): Promise<Result<void>> {
    try {
      const db = getDb();
      await db.delete(holdings).where(eq(holdings.accountId, accountId));
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete holdings by account: ${toErrorMessage(error)}`
        )
      );
    }
  }
  async deleteAll(): Promise<Result<void>> {
    try {
      const db = getDb();
      await db.delete(holdings);
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete all holdings: ${toErrorMessage(error)}`
        )
      );
    }
  }}
