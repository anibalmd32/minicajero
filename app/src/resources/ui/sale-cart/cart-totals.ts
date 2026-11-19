import { percentOf, usdToBs } from "../../../lib/money";
import type { SaleInput } from "../invoices";
import type { Cart, CartLine, CartTotals } from "./cart.types";

/** Importe de la línea en centavos USD. */
export function lineTotalUsd(line: Pick<CartLine, "price_usd_cents" | "quantity">): number {
  return line.price_usd_cents * line.quantity;
}

/**
 * Totales con la misma regla que el servidor: Bs de cada línea con la tasa, subtotal Bs como suma de líneas,
 * IVA calculado por separado en cada moneda sobre su subtotal.
 */
export function computeTotals(lines: readonly CartLine[], rate: number | null, taxPercent: number): CartTotals {
  const subtotalUsd = lines.reduce((sum, line) => sum + lineTotalUsd(line), 0);
  const taxUsd = percentOf(subtotalUsd, taxPercent);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const base = { units, subtotal_usd_cents: subtotalUsd, tax_usd_cents: taxUsd, total_usd_cents: subtotalUsd + taxUsd };
  if (rate === null) return { ...base, subtotal_bs_cents: null, tax_bs_cents: null, total_bs_cents: null };
  const subtotalBs = lines.reduce((sum, line) => sum + usdToBs(lineTotalUsd(line), rate), 0);
  const taxBs = percentOf(subtotalBs, taxPercent);
  return { ...base, subtotal_bs_cents: subtotalBs, tax_bs_cents: taxBs, total_bs_cents: subtotalBs + taxBs };
}

/** Cuerpo de `POST /invoices` para la venta, con los precios, la tasa y el IVA mostrados al operador. */
export function toSaleInput(cart: Cart, rate: number | null, taxPercent: number): SaleInput {
  return {
    payment_type: cart.payment_type,
    customer_id: cart.customer?.id ?? null,
    items: cart.lines.map((line) => ({
      product_id: line.product_id,
      quantity: line.quantity,
      unit_price_usd_cents: line.price_usd_cents,
    })),
    expected_rate: rate,
    expected_tax_percent: taxPercent,
  };
}
