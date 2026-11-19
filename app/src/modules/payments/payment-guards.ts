import type { Database } from "bun:sqlite";
import { BadRequestError, ConflictError } from "../../lib/http-errors";
import { usdToBs } from "../../lib/money";
import { getCurrentRate } from "../exchange-rates/exchange-rates.service";
import { formatDualAmount, rateFormat } from "../invoices/invoice-format";
import type { InvoiceRow } from "../invoices/invoices.types";
import { convertPayment } from "./payment-conversion";
import { PAYMENT_ERROR_MESSAGE } from "./payment-validation";
import type { PaymentAmounts, PaymentRequest } from "./payments.types";

const NO_RATE_MESSAGE =
  "No hay tasa de cambio disponible: no se pueden registrar abonos sin tasa. Fija una tasa manual en Configuración.";
const STALE_RATE_MESSAGE = "La tasa cambió desde que abriste el abono. Revisa la conversión y confirma de nuevo.";

export function rateForPayment(request: PaymentRequest, db: Database): number {
  let rate: number;
  try {
    rate = getCurrentRate(db).rate;
  } catch (err) {
    if (err instanceof ConflictError) throw new ConflictError(NO_RATE_MESSAGE);
    throw err;
  }
  if (request.expected_rate !== null && request.expected_rate !== rate) {
    throw new ConflictError(STALE_RATE_MESSAGE, {
      rate: `La tasa vigente ahora es Bs ${rateFormat.format(rate)} por $`,
    });
  }
  return rate;
}

export function convertOrThrow(request: PaymentRequest, rate: number): PaymentAmounts {
  let amounts: PaymentAmounts;
  try {
    amounts = convertPayment(request.amount_cents, request.currency, rate);
  } catch (err) {
    if (err instanceof RangeError)
      throw new BadRequestError(PAYMENT_ERROR_MESSAGE, { amount: "El monto es demasiado grande" });
    throw err;
  }
  if (amounts.amount_usd_cents <= 0 || amounts.amount_bs_cents <= 0) {
    throw new BadRequestError(PAYMENT_ERROR_MESSAGE, {
      amount: "El monto es demasiado pequeño: equivale a menos de $ 0,01",
    });
  }
  return amounts;
}

export function exceedsBalanceError(
  subject: string,
  balanceUsdCents: number,
  request: PaymentRequest,
  rate: number,
): ConflictError {
  const available = formatDualAmount(balanceUsdCents, usdToBs(balanceUsdCents, rate), request.currency);
  return new ConflictError(`El abono supera el saldo pendiente ${subject}. Saldo disponible: ${available}`, {
    amount: `Como máximo ${available}`,
  });
}

export function assertPayable(invoice: InvoiceRow): void {
  const label = `La factura #${invoice.number}`;
  if (invoice.status === "void") throw new ConflictError(`${label} está anulada: no admite abonos`);
  if (invoice.payment_type === "cash") throw new ConflictError(`${label} es de contado: se cobró completa al vender`);
  if (invoice.status === "paid") throw new ConflictError(`${label} ya está pagada`);
}
