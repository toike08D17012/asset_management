// ============================================================
// API: /api/accounts - アカウント一覧 & 作成
// REQ-010: アカウントCRUD
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAccountService } from "@/lib/service-container";
import { Brokerage } from "@/domain/types";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { parseJsonObject, readEnumField, readStringField } from "@/lib/request-validation";

export const GET = requireAuth(async () => {
  return withApiHandler(async () => {
    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.listAccounts();
    return resultToResponse(result, { wrapKey: "accounts" });
  }, "Failed to list accounts");
});

export const POST = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const bodyResult = await parseJsonObject(request, { maxChars: 16_384 });
    if (!bodyResult.ok) return bodyResult.response;

    const nameResult = readStringField(bodyResult.data, "name", {
      required: true,
      minLength: 1,
      maxLength: 100,
      label: "口座名",
    });
    if (!nameResult.ok) return nameResult.response;

    const brokerageResult = readEnumField(
      bodyResult.data,
      "brokerage",
      [Brokerage.RAKUTEN, Brokerage.SBI] as const,
      { required: true, label: "証券会社" },
    );
    if (!brokerageResult.ok) return brokerageResult.response;

    const usernameResult = readStringField(bodyResult.data, "username", {
      required: true,
      minLength: 1,
      maxLength: 256,
      label: "ログインID",
    });
    if (!usernameResult.ok) return usernameResult.response;

    const passwordResult = readStringField(bodyResult.data, "password", {
      required: true,
      minLength: 1,
      maxLength: 256,
      trim: false,
      label: "パスワード",
    });
    if (!passwordResult.ok) return passwordResult.response;

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.addAccount({
      name: nameResult.value!,
      brokerage: brokerageResult.value!,
      username: usernameResult.value!,
      password: passwordResult.value!,
    });

    return resultToResponse(result, { wrapKey: "account", status: 201 });
  }, "Failed to create account");
});
