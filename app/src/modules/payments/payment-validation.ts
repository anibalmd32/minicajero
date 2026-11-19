import { toCents } from "../../lib/money";
import type { JsonObject } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import { Validator } from "../../lib/validation";
import { PAYMENT_CURRENCIES, type PaymentRequest } from "./payments.types";

const AMOUNT_MAX = 1_000_000_000_000;
const NOTES_MAX_LENGTH = 200;
export const PAYMENT_ERROR_MESSAGE = "Revisa los datos del abono";

/**
 * Valida el cuerpo de un abono: `amount` (> 0, hasta 2 decimales) en la moneda `currency` (`USD` o `VES`),
 * `notes` opcional y `expected_rate` opcional (la tasa que vio el operador). Lanza 400 con detalle por campo.
 */
export function validatePayment(body: JsonObject): PaymentRequest {
  const v = new Validator(body);
  if (typeof body.amount === "number" && body.amount <= 0) v.addError("amount", "Debe ser mayor que 0");
  const amount = v.nonNegativeNumber("amount", { maxDecimals: 2, max: AMOUNT_MAX });
  const currency = v.oneOf("currency", PAYMENT_CURRENCIES);
  const notes = v.optionalString("notes", { max: NOTES_MAX_LENGTH });
  const expected_rate = v.nonNegativeNumber("expected_rate", { optional: true });
  v.assertValid(PAYMENT_ERROR_MESSAGE);
  return {
    amount_cents: toCents(amount),
    currency,
    notes: notes === null ? null : collapseSpaces(notes),
    expected_rate,
  };
}
