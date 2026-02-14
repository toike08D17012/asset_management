// ============================================================
// Domain Types - Branded Types, Result, Enums
// REQ: 全体のドメインモデル基盤
// ============================================================

// --- Branded Types ---
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type AccountId = Brand<string, "AccountId">;
export type HoldingId = Brand<string, "HoldingId">;
export type SnapshotId = Brand<string, "SnapshotId">;

export function createAccountId(id: string): AccountId {
  return id as AccountId;
}
export function createHoldingId(id: string): HoldingId {
  return id as HoldingId;
}
export function createSnapshotId(id: string): SnapshotId {
  return id as SnapshotId;
}

// --- Result Type ---
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// --- Currency ---
export const Currency = {
  JPY: "JPY",
  USD: "USD",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

// --- Brokerage ---
export const Brokerage = {
  RAKUTEN: "rakuten",
  SBI: "sbi",
} as const;
export type Brokerage = (typeof Brokerage)[keyof typeof Brokerage];

export function brokerageDisplayName(brokerage: Brokerage): string {
  switch (brokerage) {
    case Brokerage.RAKUTEN:
      return "楽天証券";
    case Brokerage.SBI:
      return "SBI証券";
  }
}

// --- Security Type ---
export const SecurityType = {
  STOCK: "stock",
  MUTUAL_FUND: "mutualFund",
} as const;
export type SecurityType = (typeof SecurityType)[keyof typeof SecurityType];

export function securityTypeDisplayName(type: SecurityType): string {
  switch (type) {
    case SecurityType.STOCK:
      return "株式";
    case SecurityType.MUTUAL_FUND:
      return "投資信託";
  }
}

// --- Quantity Unit ---
export const QuantityUnit = {
  SHARES: "shares",
  UNITS: "units",
} as const;
export type QuantityUnit = (typeof QuantityUnit)[keyof typeof QuantityUnit];

// --- Common Interfaces ---
export interface Entity {
  readonly id: string;
}

export interface TimePeriod {
  readonly start: Date;
  readonly end: Date;
}

export interface QueryCriteria<T = unknown> {
  readonly filters?: Partial<T>;
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly order?: "asc" | "desc";
}

// --- Repository Interfaces (ISP準拠) ---
export interface IReadRepository<T extends Entity> {
  findById(id: string): Promise<Result<T | null>>;
  query(criteria: QueryCriteria<T>): Promise<Result<T[]>>;
}

export interface IWriteRepository<T extends Entity>
  extends IReadRepository<T> {
  save(entity: T): Promise<Result<T>>;
  delete(id: string): Promise<Result<void>>;
}
