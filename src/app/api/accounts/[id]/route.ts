// ============================================================
// API: /api/accounts/[id] - アカウント更新 & 削除
// REQ-010: アカウントCRUD
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAccountService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export const GET = requireAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withApiHandler(async () => {
    const { id } = await params;
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
    const body = await request.json();

    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.updateAccount(id, body);
    return resultToResponse(result, { wrapKey: "account" });
  }, "Failed to update account");
});

export const DELETE = requireAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withApiHandler(async () => {
    const { id } = await params;
    const serviceResult = getAccountService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.deleteAccount(id);
    if (!result.ok) return resultToResponse(result);

    return NextResponse.json({ success: true });
  }, "Failed to delete account");
});
