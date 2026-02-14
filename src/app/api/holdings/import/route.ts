// ============================================================
// API: /api/holdings/import - CSVインポート
// REQ-017: CSV/HTMLエクスポート経由取得
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getHoldingsService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export const POST = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const body = await request.json();
    const { accountId, csvContent } = body;

    if (!accountId || !csvContent) {
      return NextResponse.json(
        { error: "accountId と csvContent は必須です" },
        { status: 400 }
      );
    }

    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.importFromCSV(
      accountId,
      csvContent
    );
    if (!result.ok) return resultToResponse(result);

    return NextResponse.json({
      success: true,
      message: `${result.value.length}件の保有証券をインポートしました`,
      count: result.value.length,
    });
  }, "インポートに失敗しました");
});
