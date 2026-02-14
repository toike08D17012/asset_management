import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSession, validateSession } from "@/lib/session";

const ORIGINAL_ENV = { ...process.env };

describe("session", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      SESSION_SECRET: "test-session-secret",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates and validates session token", () => {
    const token = createSession("passphrase-123");
    const passphrase = validateSession(token);

    expect(passphrase).toBe("passphrase-123");
  });

  it("returns null for tampered token", () => {
    const token = createSession("passphrase-123");
    const tampered = `${token}tampered`;

    expect(validateSession(tampered)).toBeNull();
  });

  it("rejects session creation in production when SESSION_SECRET is missing", () => {
    process.env = {
      ...process.env,
      SESSION_SECRET: undefined,
      NODE_ENV: "production",
    };

    expect(() => createSession("passphrase-123")).toThrow(
      "SESSION_SECRET must be configured in production."
    );
  });

  it("rejects too long passphrase for session payload", () => {
    const tooLong = "a".repeat(513);
    expect(() => createSession(tooLong)).toThrow("Invalid passphrase length for session.");
  });
});
