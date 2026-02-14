// ============================================================
// API: /api/holdings/clear - 全保有証券データ削除
// ============================================================

import { NextResponse } from "next/server";
import { getHoldingsService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export const DELETE = requireAuth(async () => {
  return withApiHandler(async () => {
    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.clearAllHoldings();
    if (!result.ok) return resultToResponse(result);

    return NextResponse.json({
      success: true,
      message: "全ての保有証券データを削除しました",
    });
  }, "削除に失敗しました");
});
