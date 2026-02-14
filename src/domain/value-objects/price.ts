// ============================================================
// Value Object: Price (価格)
// REQ-022, REQ-023: 多通貨対応
// ============================================================

import { type Currency, type Result, ok, err } from "@/domain/types";

export interface Price {
  readonly amount: number;
  readonly currency: Currency;
}

export function createPrice(
  amount: number,
  currency: Currency
): Result<Price> {
  if (amount < 0) {
    return err(new Error("Price amount must be non-negative"));
  }
  return ok({ amount, currency });
}

export function priceEquals(a: Price, b: Price): boolean {
  return a.amount === b.amount && a.currency === b.currency;
}

export function priceMultiply(price: Price, factor: number): Result<Price> {
  if (factor < 0) {
    return err(new Error("Multiplication factor must be non-negative"));
  }
  return ok({ amount: price.amount * factor, currency: price.currency });
}

export function priceAdd(a: Price, b: Price): Result<Price> {
  if (a.currency !== b.currency) {
    return err(
      new Error(
        `Cannot add prices with different currencies: ${a.currency} and ${b.currency}`
      )
    );
  }
  return ok({ amount: a.amount + b.amount, currency: a.currency });
}

export function priceSubtract(a: Price, b: Price): Result<Price> {
  if (a.currency !== b.currency) {
    return err(
      new Error(
        `Cannot subtract prices with different currencies: ${a.currency} and ${b.currency}`
      )
    );
  }
  return ok({ amount: a.amount - b.amount, currency: a.currency });
}

export function formatPrice(price: Price): string {
  if (price.currency === "JPY") {
    return `¥${Math.round(price.amount).toLocaleString()}`;
  }
  return `$${price.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
