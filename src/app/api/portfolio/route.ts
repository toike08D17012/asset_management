// ============================================================
// API: /api/portfolio - ポートフォリオサマリー
// REQ-003, REQ-015
// ============================================================

import { getHoldingsService } from "@/lib/service-container";
import { withApiHandler, resultToResponse } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export const GET = requireAuth(async () => {
  return withApiHandler(async () => {
    const serviceResult = getHoldingsService();
    if (!serviceResult.ok) return resultToResponse(serviceResult);

    const result = await serviceResult.value.getPortfolioSummary();
    return resultToResponse(result, { wrapKey: "portfolio" });
  }, "Failed to get portfolio");
});
