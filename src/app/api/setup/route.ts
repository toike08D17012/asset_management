// ============================================================
// API: /api/setup - 初回セットアップ
// REQ-032: マスターキー生成
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  isSetupComplete,
  setupEncryption,
  unlockWithPassphrase,
} from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { createSession } from "@/lib/session";
import { parseJsonObject, readEnumField, readStringField } from "@/lib/request-validation";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24, // 24 hours
  path: "/",
};

function createSessionResponse(passphrase: string, message: string): NextResponse {
  const token = createSession(passphrase);
  const response = NextResponse.json({ success: true, message });
  response.cookies.set("session", token, SESSION_COOKIE_OPTIONS);
  return response;
}

export function GET() {
  return withApiHandler(async () => {
    return NextResponse.json({
      setupComplete: isSetupComplete(),
    });
  });
}

export function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const bodyResult = await parseJsonObject(request, { maxChars: 8_192 });
    if (!bodyResult.ok) return bodyResult.response;

    const passphraseResult = readStringField(bodyResult.data, "passphrase", {
      required: true,
      trim: false,
      minLength: 8,
      maxLength: 256,
      label: "パスフレーズ",
    });
    if (!passphraseResult.ok) return passphraseResult.response;

    const actionResult = readEnumField(bodyResult.data, "action", ["setup", "unlock"] as const, {
      required: false,
      label: "action",
    });
    if (!actionResult.ok) return actionResult.response;

    const passphrase = passphraseResult.value!;
    const action = actionResult.value;

    if (action === "unlock") {
      const result = unlockWithPassphrase(passphrase);
      if (!result.ok) return resultToResponse(result);

      return createSessionResponse(passphrase, "アンロックしました");
    }

    // Default: setup
    if (isSetupComplete()) {
      // Already set up, try to unlock
      const result = unlockWithPassphrase(passphrase);
      if (!result.ok) return resultToResponse(result);

      return createSessionResponse(passphrase, "アンロックしました");
    }

    const result = setupEncryption(passphrase);
    if (!result.ok) return resultToResponse(result);

    return createSessionResponse(passphrase, "セットアップが完了しました");
  }, "セットアップに失敗しました");
}
