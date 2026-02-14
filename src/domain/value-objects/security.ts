// ============================================================
// Value Object: Security (証券情報)
// REQ-024, REQ-025: 株式と投資信託の区別
// ============================================================

import {
  type Currency,
  type SecurityType,
  type Result,
  ok,
  err,
} from "@/domain/types";

export interface Security {
  readonly ticker: string;
  readonly name: string;
  readonly type: SecurityType;
  readonly currency: Currency;
}

export function createSecurity(params: {
  ticker: string;
  name: string;
  type: SecurityType;
  currency: Currency;
}): Result<Security> {
  if (!params.ticker || params.ticker.trim().length === 0) {
    return err(new Error("Security ticker must not be empty"));
  }
  if (!params.name || params.name.trim().length === 0) {
    return err(new Error("Security name must not be empty"));
  }
  return ok({
    ticker: params.ticker.trim(),
    name: params.name.trim(),
    type: params.type,
    currency: params.currency,
  });
}

export function securityEquals(a: Security, b: Security): boolean {
  return a.ticker === b.ticker && a.currency === b.currency;
}

export function securityDisplayLabel(security: Security): string {
  return `${security.ticker} - ${security.name}`;
}
