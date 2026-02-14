// ============================================================
// Repository Interfaces (Domain Layer)
// ドメイン固有のリポジトリインターフェース
// ISP (Interface Segregation Principle) 準拠
// ============================================================

import type { Result, AccountId, IWriteRepository } from "@/domain/types";
import type { Account } from "@/domain/entities/account";
import type { Holding } from "@/domain/entities/holding";
import type { Snapshot } from "@/domain/entities/snapshot";

/**
 * アカウントリポジトリインターフェース
 */
export interface IAccountRepository extends IWriteRepository<Account> {
  updateLastSyncedAt(id: AccountId): Promise<Result<void>>;
}

/**
 * 保有証券リポジトリインターフェース
 */
export interface IHoldingRepository extends IWriteRepository<Holding> {
  findByAccountId(accountId: AccountId): Promise<Result<Holding[]>>;
  saveMany(holdings: Holding[]): Promise<Result<void>>;
  deleteByAccountId(accountId: AccountId): Promise<Result<void>>;
  deleteAll(): Promise<Result<void>>;
}

/**
 * スナップショットリポジトリインターフェース
 */
export interface ISnapshotRepository {
  save(snapshot: Snapshot): Promise<Result<Snapshot>>;
  findByPeriod(start: Date, end: Date): Promise<Result<Snapshot[]>>;
  findLatest(count?: number): Promise<Result<Snapshot[]>>;
}
