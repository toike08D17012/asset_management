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

export function GET() {
  return withApiHandler(async () => {
    return NextResponse.json({
      setupComplete: isSetupComplete(),
    });
  });
}

export function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const body = await request.json();
    const { passphrase, action } = body;

    if (!passphrase || typeof passphrase !== "string") {
      return NextResponse.json(
        { error: "パスフレーズは必須です" },
        { status: 400 }
      );
    }

    if (passphrase.length < 8) {
      return NextResponse.json(
        { error: "パスフレーズは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    if (action === "unlock") {
      const result = unlockWithPassphrase(passphrase);
      if (!result.ok) return resultToResponse(result);
      
      // Create session from user passphrase
      const token = createSession(passphrase);
      const response = NextResponse.json({ success: true, message: "アンロックしました" });
      response.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
      return response;
    }

    // Default: setup
    if (isSetupComplete()) {
      // Already set up, try to unlock
      const result = unlockWithPassphrase(passphrase);
      if (!result.ok) return resultToResponse(result);
      
      // Create session from user passphrase
      const token = createSession(passphrase);
      const response = NextResponse.json({
        success: true,
        message: "アンロックしました",
      });
      response.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
      return response;
    }

    const result = setupEncryption(passphrase);
    if (!result.ok) return resultToResponse(result);

    // Create session from user passphrase
    const token = createSession(passphrase);
    const response = NextResponse.json({
      success: true,
      message: "セットアップが完了しました",
    });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  }, "セットアップに失敗しました");
}
