// ============================================================
// Entity: Account (証券口座)
// REQ-008: 暗号化保存, REQ-009: 楽天/SBI対応, REQ-010: CRUD
// ============================================================

import {
  type AccountId,
  type Brokerage,
  type Entity,
  type Result,
  createAccountId,
  ok,
  err,
} from "@/domain/types";
import { v4 as uuidv4 } from "uuid";

export interface Account extends Entity {
  readonly id: AccountId;
  readonly name: string;
  readonly brokerage: Brokerage;
  readonly encryptedUsername: string;
  readonly encryptedPassword: string;
  readonly createdAt: Date;
  readonly lastSyncedAt: Date | null;
}

export interface AccountCredentials {
  readonly name: string;
  readonly brokerage: Brokerage;
  readonly username: string;
  readonly password: string;
}

export function createAccount(params: {
  name: string;
  brokerage: Brokerage;
  encryptedUsername: string;
  encryptedPassword: string;
}): Result<Account> {
  if (!params.name || params.name.trim().length === 0) {
    return err(new Error("Account name must not be empty"));
  }
  return ok({
    id: createAccountId(uuidv4()),
    name: params.name.trim(),
    brokerage: params.brokerage,
    encryptedUsername: params.encryptedUsername,
    encryptedPassword: params.encryptedPassword,
    createdAt: new Date(),
    lastSyncedAt: null,
  });
}

export interface AccountSummary {
  readonly id: AccountId;
  readonly name: string;
  readonly brokerage: Brokerage;
  readonly createdAt: Date;
  readonly lastSyncedAt: Date | null;
}

export function toAccountSummary(account: Account): AccountSummary {
  return {
    id: account.id,
    name: account.name,
    brokerage: account.brokerage,
    createdAt: account.createdAt,
    lastSyncedAt: account.lastSyncedAt,
  };
}
