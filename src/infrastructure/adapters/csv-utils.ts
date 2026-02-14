// ============================================================
// CSV Parsing Utilities
// 共通のCSV解析ヘルパー関数
// ============================================================

/**
 * CSVの1行をフィールド配列にパースする
 * ダブルクォートで囲まれたフィールド内のカンマを正しく処理する
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * 数値文字列をパースする
 * カンマ、空白、通貨記号（¥, $）を除去してから変換する
 */
export function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[,\s¥$]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * BOM (Byte Order Mark) を除去する
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.substring(1);
  }
  return content;
}
