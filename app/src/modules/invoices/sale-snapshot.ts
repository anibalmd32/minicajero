import { BadRequestError } from "../../lib/http-errors";
import { percentOf, usdToBs } from "../../lib/money";
import type { ProductRow } from "../products/products.repository";
import type { InvoiceItemData } from "./invoices.types";
import type { PricedLine, SaleLine, SaleSnapshot } from "./sale.types";
import { requireProduct } from "./sale-products";

function pricedItem(line: PricedLine, rate: number): InvoiceItemData {
  const lineTotalUsd = line.unit_price_usd_cents * line.quantity;
  return {
    product_id: line.product_id,
    product_name: line.product_name,
    quantity: line.quantity,
    unit_price_usd_cents: line.unit_price_usd_cents,
    unit_price_bs_cents: usdToBs(line.unit_price_usd_cents, rate),
    line_total_usd_cents: lineTotalUsd,
    line_total_bs_cents: usdToBs(lineTotalUsd, rate),
  };
}

/**
 * Calcula el snapshot de montos de una venta con la tasa (Bs por USD) y el IVA (%) dados. Regla de redondeo
 * (todo half away from zero, al céntimo):
 * - USD: `línea = precio × cantidad`; `subtotal = Σ líneas`; `IVA = round(subtotal × iva%)`; `total = subtotal + IVA`.
 * - Bs del precio unitario: `round(precio_usd × tasa)` (solo informativo).
 * - Bs de cada línea: `round(línea_usd × tasa)`, convirtiendo el monto de la línea y no el precio unitario ya redondeado.
 * - `subtotal_bs = Σ líneas_bs` (puede diferir unos céntimos de `round(subtotal_usd × tasa)`);
 *   `IVA_bs = round(subtotal_bs × iva%)`; `total_bs = subtotal_bs + IVA_bs`.
 */
export function calculateSaleSnapshot(lines: readonly PricedLine[], rate: number, taxPercent: number): SaleSnapshot {
  const items = lines.map((line) => pricedItem(line, rate));
  const subtotalUsd = items.reduce((sum, item) => sum + item.line_total_usd_cents, 0);
  const subtotalBs = items.reduce((sum, item) => sum + item.line_total_bs_cents, 0);
  const taxUsd = percentOf(subtotalUsd, taxPercent);
  const taxBs = percentOf(subtotalBs, taxPercent);
  const amounts = [subtotalUsd, subtotalBs, subtotalUsd + taxUsd, subtotalBs + taxBs];
  if (!amounts.every(Number.isSafeInteger)) throw new RangeError("Monto de la venta fuera de rango");
  return {
    items,
    rate,
    tax_percent: taxPercent,
    subtotal_usd_cents: subtotalUsd,
    tax_usd_cents: taxUsd,
    total_usd_cents: subtotalUsd + taxUsd,
    subtotal_bs_cents: subtotalBs,
    tax_bs_cents: taxBs,
    total_bs_cents: subtotalBs + taxBs,
  };
}

export function buildSnapshot(
  lines: readonly SaleLine[],
  products: Map<number, ProductRow>,
  rate: number,
  taxPercent: number,
): SaleSnapshot {
  const priced = lines.map((line): PricedLine => {
    const product = requireProduct(products, line.product_id);
    return {
      product_id: product.id,
      product_name: product.name,
      unit_price_usd_cents: product.price_usd_cents,
      quantity: line.quantity,
    };
  });
  try {
    return calculateSaleSnapshot(priced, rate, taxPercent);
  } catch (err) {
    if (err instanceof RangeError) throw new BadRequestError("El total de la venta es demasiado grande");
    throw err;
  }
}
