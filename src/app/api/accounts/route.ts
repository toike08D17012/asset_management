// ============================================================
// API: /api/accounts - アカウント一覧 & 作成
// REQ-010: アカウントCRUD
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAccountService } from "@/lib/service-container";
import { Brokerage } from "@/domain/types";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

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
    const body = await request.json();
    const { name, brokerage, username, password } = body;

    // Validation
    if (!name || !brokerage || !username || !password) {
      return NextResponse.json(
        { error: "全フィールドを入力してください" },
        { status: 400 }
      );
    }

    if (brokerage !== Brokerage.RAKUTEN && brokerage !== Brokerage.SBI) {
      return NextResponse.json(
        { error: "証券会社は rakuten または sbi を指定してください" },
        { status: 400 }
      );
    }

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.addAccount({
      name,
      brokerage,
      username,
      password,
    });

    return resultToResponse(result, { wrapKey: "account", status: 201 });
  }, "Failed to create account");
});
