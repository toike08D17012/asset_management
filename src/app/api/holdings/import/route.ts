// ============================================================
// API: /api/holdings/import - CSVインポート
// REQ-017: CSV/HTMLエクスポート経由取得
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getHoldingsService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { parseJsonObject, readStringField } from "@/lib/request-validation";

export const POST = requireAuth(async (request: NextRequest) => {
  return withApiHandler(async () => {
    const bodyResult = await parseJsonObject(request, { maxChars: 2_000_000 });
    if (!bodyResult.ok) return bodyResult.response;

    const accountIdResult = readStringField(bodyResult.data, "accountId", {
      required: true,
      minLength: 1,
      maxLength: 128,
      label: "accountId",
    });
    if (!accountIdResult.ok) return accountIdResult.response;

    const csvContentResult = readStringField(bodyResult.data, "csvContent", {
      required: true,
      minLength: 1,
      maxLength: 1_900_000,
      trim: false,
      label: "csvContent",
    });
    if (!csvContentResult.ok) return csvContentResult.response;

    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.importFromCSV(
      accountIdResult.value!,
      csvContentResult.value!,
    );
    if (!result.ok) return resultToResponse(result);

    return NextResponse.json({
      success: true,
      message: `${result.value.length}件の保有証券をインポートしました`,
      count: result.value.length,
    });
  }, "インポートに失敗しました");
});
