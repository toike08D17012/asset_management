// ============================================================
// API Route Handler Wrapper
// APIルートの初期化・エラーハンドリングを共通化
// ============================================================

import { NextResponse } from "next/server";
import { ensureInitialized } from "@/lib/service-container";
import { toErrorMessage, isUnlockRequiredError } from "@/lib/errors";
import type { Result } from "@/domain/types";

type ApiHandler = () => Promise<NextResponse>;

/**
 * APIルートハンドラーのラッパー
 * - ensureInitialized() の呼び出し
 * - try-catch によるエラーハンドリング
 * - 統一的なエラーレスポンス形式
 */
export function withApiHandler(
  handler: ApiHandler,
  errorPrefix?: string
): Promise<NextResponse> {
  return (async () => {
    try {
      ensureInitialized();
      return await handler();
    } catch (error) {
      return NextResponse.json(
        {
          error: errorPrefix
            ? `${errorPrefix}: ${toErrorMessage(error)}`
            : toErrorMessage(error),
        },
        { status: 500 }
      );
    }
  })();
}

/**
 * Result型からNextResponseを生成するヘルパー
 */
export function resultToResponse<T>(
  result: Result<T>,
  options?: {
    status?: number;
    wrapKey?: string;
  }
): NextResponse {
  if (!result.ok) {
    const status = isUnlockRequiredError(result.error.message) ? 401 : 500;
    return NextResponse.json({ error: result.error.message }, { status });
  }

  const body = options?.wrapKey
    ? { [options.wrapKey]: result.value }
    : result.value;

  return NextResponse.json(body, { status: options?.status ?? 200 });
}
