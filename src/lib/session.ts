// ============================================================
// Session Management for Authentication
// ============================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MAX_ENCRYPTED_PAYLOAD_BYTES = 4_096;
const MAX_PASSPHRASE_LENGTH = 512;
const DEFAULT_DEV_SESSION_SECRET = "dev-session-secret-change-me";
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

function resolveSessionSecret(): string | null {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured !== DEFAULT_DEV_SESSION_SECRET) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return configured || DEFAULT_DEV_SESSION_SECRET;
}

function getSessionKey(): Buffer {
  const secret = resolveSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured in production.");
  }
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
  if (!passphrase || passphrase.length > MAX_PASSPHRASE_LENGTH) {
    throw new Error("Invalid passphrase length for session.");
  }

  const now = Date.now();
  const payload = JSON.stringify({
    passphrase,
    issuedAt: now,
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
  if (token.length > 8_192) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [ivPart, encryptedPart, tagPart] = parts;
    if (!ivPart || !encryptedPart || !tagPart) {
      return null;
    }

    const iv = fromBase64Url(ivPart);
    const encrypted = fromBase64Url(encryptedPart);
    const authTag = fromBase64Url(tagPart);
    if (iv.byteLength !== IV_LENGTH || authTag.byteLength !== AUTH_TAG_LENGTH) {
      return null;
    }
    if (encrypted.byteLength === 0 || encrypted.byteLength > MAX_ENCRYPTED_PAYLOAD_BYTES) {
      return null;
    }

    const key = getSessionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    const payload = JSON.parse(decrypted) as unknown;
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const passphrase = (payload as { passphrase?: unknown }).passphrase;
    const issuedAt = (payload as { issuedAt?: unknown }).issuedAt;
    const expiresAt = (payload as { expiresAt?: unknown }).expiresAt;

    if (
      typeof passphrase !== "string" ||
      passphrase.length === 0 ||
      passphrase.length > MAX_PASSPHRASE_LENGTH
    ) {
      return null;
    }
    if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) return null;
    if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
    if (issuedAt > expiresAt) return null;

    const now = Date.now();
    if (issuedAt > now + CLOCK_SKEW_TOLERANCE_MS) {
      return null;
    }
    if (now > expiresAt) {
      return null;
    }

    return passphrase;
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
