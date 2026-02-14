// ============================================================
// Session Management for Authentication
// ============================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getSessionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64");
}

/**
 * Create a new session
 */
export function createSession(passphrase: string): string {
  const now = Date.now();
  const payload = JSON.stringify({
    passphrase,
    expiresAt: now + SESSION_DURATION,
  });

  const key = getSessionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [toBase64Url(iv), toBase64Url(encrypted), toBase64Url(authTag)].join(".");
}

/**
 * Validate session token and return passphrase if valid
 */
export function validateSession(token: string | null | undefined): string | null {
  if (!token) return null;

  try {
    const [ivPart, encryptedPart, tagPart] = token.split(".");
    if (!ivPart || !encryptedPart || !tagPart) {
      return null;
    }

    const iv = fromBase64Url(ivPart);
    const encrypted = fromBase64Url(encryptedPart);
    const authTag = fromBase64Url(tagPart);

    const key = getSessionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    const payload = JSON.parse(decrypted) as {
      passphrase: string;
      expiresAt: number;
    };

    if (!payload.passphrase || typeof payload.passphrase !== "string") {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload.passphrase;
  } catch {
    return null;
  }
}

/**
 * Delete session (stateless: no server-side state)
 */
export function deleteSession(token: string): void {
  void token;
}
