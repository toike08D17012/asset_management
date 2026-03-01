// ============================================================
// Database Connection (better-sqlite3 + Drizzle)
// ============================================================

import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL || "./data/asset_management.db";

function ensureDbDirectory(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    ensureDbDirectory();
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
  }

  const sqlite = (_db as unknown as { $client: Database.Database }).$client;
  if (sqlite && typeof sqlite.prepare === "function") {
    ensureHoldingsAccountForeignKey(sqlite);
    ensureMarketDataCacheColumns(sqlite);
  }
  return _db;
}

export function initializeDatabase(): void {
  const db = getDb();

  // Create tables if not exist
  const sqlite = (db as unknown as { $client: Database.Database }).$client;
  if (!sqlite || typeof sqlite.exec !== "function") {
    // Fallback: use raw SQL through drizzle's run method
    const rawDb = new Database(DB_PATH);
    createTables(rawDb);
    rawDb.close();
    return;
  }
  createTables(sqlite);
}

function createTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brokerage TEXT NOT NULL CHECK(brokerage IN ('rakuten', 'sbi', 'other')),
      encrypted_username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      security_type TEXT NOT NULL CHECK(security_type IN ('stock', 'mutualFund')),
      currency TEXT NOT NULL CHECK(currency IN ('JPY', 'USD')),
      quantity REAL NOT NULL,
      quantity_unit TEXT NOT NULL CHECK(quantity_unit IN ('shares', 'units')),
      average_purchase_price REAL NOT NULL,
      current_price REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      total_value_jpy REAL NOT NULL DEFAULT 0,
      total_value_usd REAL NOT NULL DEFAULT 0,
      holdings_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS encryption_keys (
      id TEXT PRIMARY KEY,
      salt TEXT NOT NULL,
      iv TEXT NOT NULL,
      verifier TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS market_data_cache (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('JPY', 'USD')),
      security_type TEXT NOT NULL CHECK(security_type IN ('stock', 'mutualFund')),
      yahoo_symbol TEXT,
      google_symbol TEXT NOT NULL,
      sector TEXT,
      dividend_yield REAL,
      current_price REAL,
      fetched_date TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS market_symbol_cache (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      name TEXT,
      currency TEXT NOT NULL CHECK(currency IN ('JPY', 'USD')),
      security_type TEXT NOT NULL CHECK(security_type IN ('stock', 'mutualFund')),
      yahoo_symbol TEXT NOT NULL,
      resolved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings(account_id);
    CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);
    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_market_data_cache_ticker ON market_data_cache(ticker);
    CREATE INDEX IF NOT EXISTS idx_market_data_cache_fetched_date ON market_data_cache(fetched_date);
    CREATE INDEX IF NOT EXISTS idx_market_symbol_cache_ticker ON market_symbol_cache(ticker);
    CREATE INDEX IF NOT EXISTS idx_market_symbol_cache_symbol ON market_symbol_cache(yahoo_symbol);
  `);

  ensureAccountsBrokerageConstraint(sqlite);
  ensureHoldingsAccountForeignKey(sqlite);
  ensureMarketDataCacheColumns(sqlite);
}

function ensureAccountsBrokerageConstraint(sqlite: Database.Database): void {
  type MasterRow = { sql: string | null };

  try {
    const row = sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'accounts'")
      .get() as MasterRow | undefined;

    if (!row?.sql) {
      return;
    }

    const normalizedSql = row.sql.toLowerCase();
    if (normalizedSql.includes("'other'")) {
      return;
    }

    sqlite.exec("PRAGMA foreign_keys = OFF");
    sqlite.exec("BEGIN TRANSACTION");
    sqlite.exec(`
      ALTER TABLE accounts RENAME TO accounts_old;

      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brokerage TEXT NOT NULL CHECK(brokerage IN ('rakuten', 'sbi', 'other')),
        encrypted_username TEXT NOT NULL,
        encrypted_password TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_synced_at TEXT
      );

      INSERT INTO accounts (id, name, brokerage, encrypted_username, encrypted_password, created_at, last_synced_at)
      SELECT id, name, brokerage, encrypted_username, encrypted_password, created_at, last_synced_at
      FROM accounts_old;

      DROP TABLE accounts_old;
    `);
    sqlite.exec("COMMIT");
  } catch {
    try {
      sqlite.exec("ROLLBACK");
    } catch {
      // no-op
    }
  } finally {
    sqlite.exec("PRAGMA foreign_keys = ON");
  }
}

function ensureHoldingsAccountForeignKey(sqlite: Database.Database): void {
  type ForeignKeyRow = {
    table: string;
    from: string;
  };

  try {
    const foreignKeys = sqlite
      .prepare("PRAGMA foreign_key_list(holdings)")
      .all() as ForeignKeyRow[];

    if (foreignKeys.length === 0) {
      return;
    }

    const accountForeignKey = foreignKeys.find((foreignKey) => foreignKey.from === "account_id");
    if (!accountForeignKey) {
      return;
    }

    if (accountForeignKey.table === "accounts") {
      return;
    }

    sqlite.exec("PRAGMA foreign_keys = OFF");
    sqlite.exec("BEGIN TRANSACTION");
    sqlite.exec(`
      ALTER TABLE holdings RENAME TO holdings_old;

      CREATE TABLE holdings (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        security_type TEXT NOT NULL CHECK(security_type IN ('stock', 'mutualFund')),
        currency TEXT NOT NULL CHECK(currency IN ('JPY', 'USD')),
        quantity REAL NOT NULL,
        quantity_unit TEXT NOT NULL CHECK(quantity_unit IN ('shares', 'units')),
        average_purchase_price REAL NOT NULL,
        current_price REAL NOT NULL,
        recorded_at TEXT NOT NULL
      );

      INSERT INTO holdings (
        id,
        account_id,
        ticker,
        name,
        security_type,
        currency,
        quantity,
        quantity_unit,
        average_purchase_price,
        current_price,
        recorded_at
      )
      SELECT
        id,
        account_id,
        ticker,
        name,
        security_type,
        currency,
        quantity,
        quantity_unit,
        average_purchase_price,
        current_price,
        recorded_at
      FROM holdings_old;

      DROP TABLE holdings_old;

      CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings(account_id);
      CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);
    `);
    sqlite.exec("COMMIT");
  } catch {
    try {
      sqlite.exec("ROLLBACK");
    } catch {
      // no-op
    }
  } finally {
    sqlite.exec("PRAGMA foreign_keys = ON");
  }
}

function ensureMarketDataCacheColumns(sqlite: Database.Database): void {
  type TableInfoRow = {
    name: string;
  };
  try {
    const columns = sqlite
      .prepare("PRAGMA table_info(market_data_cache)")
      .all() as TableInfoRow[];

    if (columns.length === 0) {
      return;
    }

    const hasCurrentPrice = columns.some((column) => column.name === "current_price");
    if (!hasCurrentPrice) {
      sqlite.exec("ALTER TABLE market_data_cache ADD COLUMN current_price REAL");
    }
  } catch {
    // DB初期化直後など、テーブル未作成タイミングではスキップ
  }
}

export { schema };
