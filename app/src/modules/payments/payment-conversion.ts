import { bsToUsd, usdToBs } from "../../lib/money";
import type { PaymentAllocation, PaymentAmounts, PaymentCurrency } from "./payments.types";
import type { PendingInvoiceRow } from "./statement.types";

/** Diferencia máxima (en centavos USD) que se absorbe al convertir un abono en Bs para saldar exacto. */
export const SETTLE_TOLERANCE_CENTS = 1;

/** Convierte el monto recibido a ambas monedas con la tasa dada: en USD calcula los Bs y en Bs calcula los USD. */
export function convertPayment(amountCents: number, currency: PaymentCurrency, rate: number): PaymentAmounts {
  return currency === "USD"
    ? { amount_usd_cents: amountCents, amount_bs_cents: usdToBs(amountCents, rate) }
    : { amount_usd_cents: bsToUsd(amountCents, rate), amount_bs_cents: amountCents };
}

/**
 * Ajusta el abono al saldo: si se recibió en Bs y su equivalente en USD queda a `SETTLE_TOLERANCE_CENTS` o menos
 * del saldo (por redondeo de la conversión), salda exacto. Devuelve `null` si aun así supera el saldo.
 */
export function fitToBalance(
  amounts: PaymentAmounts,
  currency: PaymentCurrency,
  balanceUsdCents: number,
): PaymentAmounts | null {
  const difference = amounts.amount_usd_cents - balanceUsdCents;
  if (currency === "VES" && difference !== 0 && Math.abs(difference) <= SETTLE_TOLERANCE_CENTS) {
    return { ...amounts, amount_usd_cents: balanceUsdCents };
  }
  return difference > 0 ? null : amounts;
}

/**
 * Reparte un abono entre facturas pendientes, de la primera a la última (FIFO): cada una recibe hasta su saldo.
 * Los Bs de cada parte se calculan con la tasa si el abono fue en USD; si fue en Bs, cada parte lleva su
 * equivalente y la última el resto, para que la suma sea exactamente lo recibido.
 */
export function allocateFifo(
  invoices: readonly Pick<PendingInvoiceRow, "id" | "balance_usd_cents">[],
  amounts: PaymentAmounts,
  currency: PaymentCurrency,
  rate: number,
): PaymentAllocation[] {
  const allocations: PaymentAllocation[] = [];
  let remaining = amounts.amount_usd_cents;
  for (const invoice of invoices) {
    if (remaining <= 0) break;
    const usd = Math.min(remaining, invoice.balance_usd_cents);
    if (usd <= 0) continue;
    allocations.push({ invoice_id: invoice.id, amount_usd_cents: usd, amount_bs_cents: usdToBs(usd, rate) });
    remaining -= usd;
  }
  const last = allocations.at(-1);
  if (currency === "VES" && last) {
    const allocatedBs = allocations.reduce((sum, item) => sum + item.amount_bs_cents, 0) - last.amount_bs_cents;
    const lastBs = amounts.amount_bs_cents - allocatedBs;
    if (lastBs > 0) last.amount_bs_cents = lastBs;
  }
  return allocations;
}
