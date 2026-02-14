/**
 * 表示用の銘柄名正規化
 * - 全角スペースを半角スペースへ変換
 * - 全角英数字を半角英数字へ変換
 */
export function normalizeSecurityNameForDisplay(name: string): string {
  return name
    .replace(/\u3000/g, " ")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    );
}
