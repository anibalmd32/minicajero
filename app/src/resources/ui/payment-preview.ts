import { bsToUsd, usdToBs } from "../../lib/money";
import type { PaymentCurrency, PaymentPreview } from "./payments.types";

/** Diferencia (centavos USD) que el servidor absorbe al convertir un abono en Bs para saldar exacto. */
export const SETTLE_TOLERANCE_CENTS = 1;

/**
 * Calcula lo mismo que el servidor al registrar un abono: convierte con la tasa (en USD calcula los Bs y en Bs
 * los USD) y, si se recibió en Bs y queda a `SETTLE_TOLERANCE_CENTS` del saldo, lo salda exacto.
 */
export function previewPayment(
  amountCents: number,
  currency: PaymentCurrency,
  rate: number,
  balanceUsdCents: number,
): PaymentPreview {
  const converted = currency === "USD" ? amountCents : bsToUsd(amountCents, rate);
  const difference = converted - balanceUsdCents;
  const absorbed = currency === "VES" && Math.abs(difference) <= SETTLE_TOLERANCE_CENTS;
  const usd = absorbed ? balanceUsdCents : converted;
  return {
    usd_cents: usd,
    bs_cents: currency === "USD" ? usdToBs(amountCents, rate) : amountCents,
    remaining_usd_cents: Math.max(balanceUsdCents - usd, 0),
    exceeds: usd > balanceUsdCents,
    settles: usd === balanceUsdCents,
  };
}

/** Monto (en centavos o céntimos de la moneda elegida) que salda exactamente el saldo con la tasa dada. */
export function settleAmountCents(balanceUsdCents: number, currency: PaymentCurrency, rate: number): number {
  return currency === "USD" ? balanceUsdCents : usdToBs(balanceUsdCents, rate);
}
