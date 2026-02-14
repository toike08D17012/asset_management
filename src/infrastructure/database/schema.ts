// ============================================================
// Database Schema (Drizzle ORM + SQLite)
// REQ-002, REQ-008, REQ-013
// ============================================================

import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// --- Accounts Table ---
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brokerage: text("brokerage", { enum: ["rakuten", "sbi"] }).notNull(),
  encryptedUsername: text("encrypted_username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  createdAt: text("created_at").notNull(),
  lastSyncedAt: text("last_synced_at"),
});

// --- Holdings Table ---
export const holdings = sqliteTable("holdings", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  securityType: text("security_type", {
    enum: ["stock", "mutualFund"],
  }).notNull(),
  currency: text("currency", { enum: ["JPY", "USD"] }).notNull(),
  quantity: real("quantity").notNull(),
  quantityUnit: text("quantity_unit", {
    enum: ["shares", "units"],
  }).notNull(),
  averagePurchasePrice: real("average_purchase_price").notNull(),
  currentPrice: real("current_price").notNull(),
  recordedAt: text("recorded_at").notNull(),
});

// --- Snapshots Table ---
export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  totalValueJPY: real("total_value_jpy").notNull().default(0),
  totalValueUSD: real("total_value_usd").notNull().default(0),
  holdingsData: text("holdings_data").notNull(), // JSON stringified
});

// --- Encryption Keys Table ---
export const encryptionKeys = sqliteTable("encryption_keys", {
  id: text("id").primaryKey(),
  salt: text("salt").notNull(),
  iv: text("iv").notNull(),
  verifier: text("verifier").notNull(), // Encrypted known string for passphrase validation
  createdAt: text("created_at").notNull(),
});

// --- App Settings Table ---
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Market Data Cache Table (日次キャッシュ) ---
export const marketDataCache = sqliteTable("market_data_cache", {
  id: text("id").primaryKey(),
  ticker: text("ticker").notNull(),
  currency: text("currency", { enum: ["JPY", "USD"] }).notNull(),
  securityType: text("security_type", {
    enum: ["stock", "mutualFund"],
  }).notNull(),
  yahooSymbol: text("yahoo_symbol"),
  googleSymbol: text("google_symbol").notNull(),
  sector: text("sector"),
  dividendYield: real("dividend_yield"),
  currentPrice: real("current_price"),
  fetchedDate: text("fetched_date").notNull(), // YYYY-MM-DD (JST)
  fetchedAt: text("fetched_at").notNull(),
});

// --- Market Symbol Cache Table (銘柄名→Yahooシンボルの恒久キャッシュ) ---
export const marketSymbolCache = sqliteTable("market_symbol_cache", {
  id: text("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name"),
  currency: text("currency", { enum: ["JPY", "USD"] }).notNull(),
  securityType: text("security_type", {
    enum: ["stock", "mutualFund"],
  }).notNull(),
  yahooSymbol: text("yahoo_symbol").notNull(),
  resolvedAt: text("resolved_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Type exports for Drizzle
export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
export type HoldingRow = typeof holdings.$inferSelect;
export type NewHoldingRow = typeof holdings.$inferInsert;
export type SnapshotRow = typeof snapshots.$inferSelect;
export type EncryptionKeyRow = typeof encryptionKeys.$inferSelect;
export type MarketDataCacheRow = typeof marketDataCache.$inferSelect;
export type MarketSymbolCacheRow = typeof marketSymbolCache.$inferSelect;
