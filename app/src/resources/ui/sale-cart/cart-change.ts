import { bsToUsd, usdToBs } from "../../../lib/money";
import type { ChangeDue, ReceivedCurrency } from "./cart.types";

function signedConversion(cents: number, convert: (value: number, rate: number) => number, rate: number): number {
  return Math.sign(cents) * convert(Math.abs(cents), rate);
}

/**
 * Vuelto al recibir `receivedCents` en `currency` por una venta de `totalUsdCents` (`totalBsCents` en Bs).
 * Se resta en la moneda recibida y se convierte la diferencia a la otra con la tasa de la venta.
 */
export function computeChange(
  totalUsdCents: number,
  totalBsCents: number,
  receivedCents: number,
  currency: ReceivedCurrency,
  rate: number,
): ChangeDue {
  if (currency === "USD") {
    const usd = receivedCents - totalUsdCents;
    return { usd_cents: usd, bs_cents: signedConversion(usd, usdToBs, rate) };
  }
  const bs = receivedCents - totalBsCents;
  return { usd_cents: signedConversion(bs, bsToUsd, rate), bs_cents: bs };
}
