// ============================================================
// Value Object: Quantity (数量)
// REQ-025: 投資信託の口数対応
// ============================================================

import { type QuantityUnit, type Result, ok, err } from "@/domain/types";

export interface Quantity {
  readonly value: number;
  readonly unit: QuantityUnit;
}

export function createQuantity(
  value: number,
  unit: QuantityUnit
): Result<Quantity> {
  if (value <= 0) {
    return err(new Error("Quantity value must be positive"));
  }
  return ok({ value, unit });
}

export function quantityAdd(a: Quantity, b: Quantity): Result<Quantity> {
  if (a.unit !== b.unit) {
    return err(
      new Error(
        `Cannot add quantities with different units: ${a.unit} and ${b.unit}`
      )
    );
  }
  return ok({ value: a.value + b.value, unit: a.unit });
}

export function quantityEquals(a: Quantity, b: Quantity): boolean {
  return a.value === b.value && a.unit === b.unit;
}

export function formatQuantity(quantity: Quantity): string {
  if (quantity.unit === "shares") {
    return `${quantity.value.toLocaleString()} 株`;
  }
  return `${quantity.value.toLocaleString()} 口`;
}
