// ============================================================
// Service Container (DI)
// ============================================================

import "server-only";

import { initializeDatabase, getDb } from "@/infrastructure/database/connection";
import { encryptionKeys } from "@/infrastructure/database/schema";
import {
  createEncryptionService,
  deriveMasterKey,
  generateMasterKeyInfo,
  validatePassphrase,
  type EncryptionService,
  type MasterKeyInfo,
} from "@/infrastructure/encryption/encryption-service";
import { AccountService } from "@/application/account-service";
import { HoldingsService } from "@/application/holdings-service";
import { AccountRepository } from "@/infrastructure/repositories/account-repository";
import { HoldingRepository } from "@/infrastructure/repositories/holding-repository";
import { SnapshotRepository } from "@/infrastructure/repositories/snapshot-repository";
import type { IAccountRepository, IHoldingRepository, ISnapshotRepository } from "@/domain/repositories";
import { type Result, ok, err } from "@/domain/types";
import { toErrorMessage } from "@/lib/errors";
import { eq } from "drizzle-orm";

let _initialized = false;
let _encryptionService: EncryptionService | null = null;
let _accountRepository: IAccountRepository | null = null;
let _holdingRepository: IHoldingRepository | null = null;
let _snapshotRepository: ISnapshotRepository | null = null;
let _accountService: AccountService | null = null;
let _holdingsService: HoldingsService | null = null;

/**
 * アプリ初期化（DB作成 + テーブル作成 + リポジトリ初期化）
 */
export function ensureInitialized(): void {
  if (!_initialized) {
    initializeDatabase();
    _accountRepository = new AccountRepository();
    _holdingRepository = new HoldingRepository();
    _snapshotRepository = new SnapshotRepository();
    _initialized = true;
  }
}

/**
 * セットアップ済みかどうかを確認
 */
export function isSetupComplete(): boolean {
  ensureInitialized();
  try {
    const db = getDb();
    const keys = db.select().from(encryptionKeys).all();
    return keys.length > 0;
  } catch {
    return false;
  }
}

/**
 * 初回セットアップ: パスフレーズでマスターキーを生成
 */
export function setupEncryption(passphrase: string): Result<void> {
  ensureInitialized();

  const keyInfoResult = generateMasterKeyInfo(passphrase);
  if (!keyInfoResult.ok) return keyInfoResult;

  const db = getDb();
  try {
    db.insert(encryptionKeys)
      .values({
        id: "master",
        salt: keyInfoResult.value.salt,
        iv: keyInfoResult.value.iv,
        verifier: keyInfoResult.value.verifier,
        createdAt: new Date().toISOString(),
      })
      .run();

    // Initialize encryption service with the derived key
    const salt = Buffer.from(keyInfoResult.value.salt, "hex");
    const masterKeyResult = deriveMasterKey(passphrase, salt);
    if (!masterKeyResult.ok) return masterKeyResult;

    _encryptionService = createEncryptionService(masterKeyResult.value);
    _accountService = new AccountService(_accountRepository!, _encryptionService);
    _holdingsService = new HoldingsService(_holdingRepository!, _accountRepository!);

    return ok(undefined);
  } catch (error) {
    return err(
      new Error(
        `Setup failed: ${toErrorMessage(error)}`
      )
    );
  }
}

/**
 * パスフレーズでアンロック
 */
export function unlockWithPassphrase(passphrase: string): Result<void> {
  ensureInitialized();

  const db = getDb();
  const keys = db
    .select()
    .from(encryptionKeys)
    .where(eq(encryptionKeys.id, "master"))
    .all();

  if (keys.length === 0) {
    return err(new Error("Encryption not set up. Please run setup first."));
  }

  const keyInfo: MasterKeyInfo = {
    salt: keys[0].salt,
    iv: keys[0].iv,
    verifier: keys[0].verifier,
  };

  const validResult = validatePassphrase(passphrase, keyInfo);
  if (!validResult.ok) return validResult;
  if (!validResult.value) {
    return err(new Error("Invalid passphrase"));
  }

  const salt = Buffer.from(keyInfo.salt, "hex");
  const masterKeyResult = deriveMasterKey(passphrase, salt);
  if (!masterKeyResult.ok) return masterKeyResult;

  _encryptionService = createEncryptionService(masterKeyResult.value);
  _accountService = new AccountService(_accountRepository!, _encryptionService);
  _holdingsService = new HoldingsService(_holdingRepository!, _accountRepository!);

  return ok(undefined);
}

/**
 * EncryptionService取得
 */
export function getEncryptionService(): Result<EncryptionService> {
  if (!_encryptionService) {
    return err(new Error("暗号化サービスが初期化されていません。パスフレーズでアンロックしてください。"));
  }
  return ok(_encryptionService);
}

/**
 * AccountService取得
 */
export function getAccountService(): Result<AccountService> {
  if (!_accountService) {
    const encResult = getEncryptionService();
    if (!encResult.ok) return encResult;
    _accountService = new AccountService(_accountRepository!, encResult.value);
  }
  return ok(_accountService);
}

/**
 * HoldingsService取得
 */
export function getHoldingsService(): Result<HoldingsService> {
  if (!_holdingsService) {
    _holdingsService = new HoldingsService(_holdingRepository!, _accountRepository!);
  }
  return ok(_holdingsService);
}

/**
 * SnapshotRepository取得
 */
export function getSnapshotRepository(): Result<ISnapshotRepository> {
  ensureInitialized();
  if (!_snapshotRepository) {
    return err(new Error("スナップショットリポジトリが初期化されていません"));
  }
  return ok(_snapshotRepository);
}
