// ============================================================
// Currency Formatting Utilities
// 通貨フォーマット関数を一元管理
// ============================================================

import type { SecurityType } from "@/domain/types";

/**
 * 日本円のフォーマット
 */
export function formatJPY(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

/**
 * 米ドルのフォーマット
 */
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 通貨に応じたフォーマッターを返す
 */
export function getFormatter(currency: string): (amount: number) => string {
  return currency === "JPY" ? formatJPY : formatUSD;
}

/**
 * 投資信託の基準価額除数を返す
 * 投資信託は1万口あたりの基準価額のため、/10000 で計算
 */
export function getMutualFundDivisor(securityType: SecurityType | string): number {
  return securityType === "mutualFund" ? 10000 : 1;
}
