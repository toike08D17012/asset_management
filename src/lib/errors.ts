// ============================================================
// Error Handling Utilities
// エラー処理の共通パターンを集約
// ============================================================

/**
 * unknown型のエラーからメッセージ文字列を抽出する
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * 暗号化サービスのアンロックが必要なエラーかどうかを判定する
 */
export function isUnlockRequiredError(message: string): boolean {
  return (
    message.includes("暗号化サービスが初期化されていません") ||
    message.includes("アンロックしてください")
  );
}
