// ============================================================
// EncryptionService
// REQ-008: AES-256暗号化, REQ-031: ハードコード禁止, REQ-032: マスターキー
// ADR-0003: Encryption Key Management
// ============================================================

import crypto from "crypto";
import { type Result, ok, err } from "@/domain/types";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const VERIFIER_TEXT = "ASSET_MANAGEMENT_KEY_VERIFIER";

export interface EncryptionService {
  encrypt(plainText: string): Result<string>;
  decrypt(cipherText: string): Result<string>;
}

export interface MasterKeyInfo {
  salt: string;
  iv: string;
  verifier: string;
}

/**
 * パスフレーズからマスターキーを導出する (PBKDF2)
 */
export function deriveMasterKey(
  passphrase: string,
  salt: Buffer
): Result<Buffer> {
  try {
    const key = crypto.pbkdf2Sync(
      passphrase,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      "sha512"
    );
    return ok(key);
  } catch (error) {
    return err(
      new Error(
        `Failed to derive master key: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

/**
 * 初回セットアップ: パスフレーズからマスターキー情報を生成する
 */
export function generateMasterKeyInfo(
  passphrase: string
): Result<MasterKeyInfo> {
  if (!passphrase || passphrase.length < 8) {
    return err(new Error("Passphrase must be at least 8 characters"));
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const keyResult = deriveMasterKey(passphrase, salt);
  if (!keyResult.ok) return keyResult;

  // Encrypt verifier text to validate passphrase later
  const cipher = crypto.createCipheriv(ALGORITHM, keyResult.value, iv);
  let encrypted = cipher.update(VERIFIER_TEXT, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return ok({
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    verifier: encrypted + ":" + tag.toString("hex"),
  });
}

/**
 * パスフレーズの検証
 */
export function validatePassphrase(
  passphrase: string,
  masterKeyInfo: MasterKeyInfo
): Result<boolean> {
  const salt = Buffer.from(masterKeyInfo.salt, "hex");
  const iv = Buffer.from(masterKeyInfo.iv, "hex");

  const keyResult = deriveMasterKey(passphrase, salt);
  if (!keyResult.ok) return keyResult;

  try {
    const [encrypted, tagHex] = masterKeyInfo.verifier.split(":");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, keyResult.value, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return ok(decrypted === VERIFIER_TEXT);
  } catch {
    return ok(false);
  }
}

/**
 * EncryptionServiceの作成
 */
export function createEncryptionService(
  masterKey: Buffer
): EncryptionService {
  return {
    encrypt(plainText: string): Result<string> {
      try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
        let encrypted = cipher.update(plainText, "utf8", "hex");
        encrypted += cipher.final("hex");
        const tag = cipher.getAuthTag();

        // Format: iv:tag:ciphertext
        const result = `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
        return ok(result);
      } catch (error) {
        return err(
          new Error(
            `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        );
      }
    },

    decrypt(cipherText: string): Result<string> {
      try {
        const parts = cipherText.split(":");
        if (parts.length !== 3) {
          return err(new Error("Invalid cipher text format"));
        }

        const [ivHex, tagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");

        const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return ok(decrypted);
      } catch (error) {
        return err(
          new Error(
            `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        );
      }
    },
  };
}
