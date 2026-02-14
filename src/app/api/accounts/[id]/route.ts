// ============================================================
// API: /api/accounts/[id] - アカウント更新 & 削除
// REQ-010: アカウントCRUD
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAccountService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { Brokerage } from "@/domain/types";
import { parseJsonObject, readEnumField, readStringField } from "@/lib/request-validation";

type AccountCredentialsUpdate = {
  name?: string;
  brokerage?: Brokerage;
  username?: string;
  password?: string;
};

function validateAccountId(id: string): NextResponse | null {
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "アカウントIDが不正です" }, { status: 400 });
  }
  return null;
}

export const GET = requireAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withApiHandler(async () => {
    const { id } = await params;
    const idError = validateAccountId(id);
    if (idError) return idError;

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.getAccount(id);
    if (!result.ok) return resultToResponse(result);
    if (!result.value) {
      return NextResponse.json(
        { error: "アカウントが見つかりません" },
        { status: 404 }
      );
    }

    // Don't expose encrypted credentials
    return NextResponse.json({
      account: {
        id: result.value.id,
        name: result.value.name,
        brokerage: result.value.brokerage,
        createdAt: result.value.createdAt,
        lastSyncedAt: result.value.lastSyncedAt,
      },
    });
  }, "Failed to get account");
});

export const PUT = requireAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withApiHandler(async () => {
    const { id } = await params;
    const idError = validateAccountId(id);
    if (idError) return idError;

    const bodyResult = await parseJsonObject(request, { maxChars: 16_384 });
    if (!bodyResult.ok) return bodyResult.response;

    const nameResult = readStringField(bodyResult.data, "name", {
      required: false,
      minLength: 1,
      maxLength: 100,
      label: "口座名",
    });
    if (!nameResult.ok) return nameResult.response;

    const brokerageResult = readEnumField(
      bodyResult.data,
      "brokerage",
      [Brokerage.RAKUTEN, Brokerage.SBI] as const,
      { required: false, label: "証券会社" },
    );
    if (!brokerageResult.ok) return brokerageResult.response;

    const usernameResult = readStringField(bodyResult.data, "username", {
      required: false,
      minLength: 1,
      maxLength: 256,
      label: "ログインID",
    });
    if (!usernameResult.ok) return usernameResult.response;

    const passwordResult = readStringField(bodyResult.data, "password", {
      required: false,
      minLength: 1,
      maxLength: 256,
      trim: false,
      label: "パスワード",
    });
    if (!passwordResult.ok) return passwordResult.response;

    const updates: AccountCredentialsUpdate = {};
    if (nameResult.value !== null) updates.name = nameResult.value;
    if (brokerageResult.value !== null) updates.brokerage = brokerageResult.value;
    if (usernameResult.value !== null) updates.username = usernameResult.value;
    if (passwordResult.value !== null) updates.password = passwordResult.value;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "更新対象のフィールドを1つ以上指定してください" },
        { status: 400 }
      );
    }

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.updateAccount(id, updates);
    return resultToResponse(result, { wrapKey: "account" });
  }, "Failed to update account");
});

export const DELETE = requireAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withApiHandler(async () => {
    const { id } = await params;
    const idError = validateAccountId(id);
    if (idError) return idError;

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.deleteAccount(id);
    if (!result.ok) return resultToResponse(result);

    return NextResponse.json({ success: true });
  }, "Failed to delete account");
});
