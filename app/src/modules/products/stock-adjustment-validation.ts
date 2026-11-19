import type { JsonObject } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import { Validator } from "../../lib/validation";
import { STOCK_MAX, type StockAdjustment } from "./products.types";

const REASON_MAX_LENGTH = 200;
const INVALID_ADJUSTMENT_MESSAGE = "Revisa el ajuste de stock";

function readReason(v: Validator): string | null {
  const reason = v.optionalString("reason", { max: REASON_MAX_LENGTH });
  return reason === null ? null : collapseSpaces(reason);
}

function assertExactlyOneOperation(v: Validator, hasDelta: boolean, hasSet: boolean): void {
  if (hasDelta !== hasSet) return;
  const message = hasDelta ? "Indica solo uno: delta o set" : "Indica delta (sumar o restar) o set (fijar el stock)";
  v.addError("delta", message);
  v.addError("set", message);
  v.assertValid(INVALID_ADJUSTMENT_MESSAGE);
}

/** Valida un ajuste de stock: exactamente uno de `delta` (entero distinto de 0) o `set` (entero >= 0), y `reason` opcional. */
export function validateStockAdjustment(body: JsonObject): StockAdjustment {
  const v = new Validator(body);
  const hasDelta = v.has("delta");
  const hasSet = v.has("set");
  const reason = readReason(v);
  assertExactlyOneOperation(v, hasDelta, hasSet);
  if (hasSet) {
    const stock = v.integer("set", { min: 0, max: STOCK_MAX });
    v.assertValid(INVALID_ADJUSTMENT_MESSAGE);
    return { kind: "set", stock, reason };
  }
  const delta = v.integer("delta", { min: -STOCK_MAX, max: STOCK_MAX });
  if (delta === 0) v.addError("delta", "Debe ser distinto de 0");
  v.assertValid(INVALID_ADJUSTMENT_MESSAGE);
  return { kind: "delta", delta, reason };
}
