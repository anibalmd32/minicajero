import type { Database } from "bun:sqlite";
import { BadRequestError, ConflictError, type ErrorDetails } from "../../lib/http-errors";
import { findCustomerById } from "../customers/customer-search.repository";
import { getCurrentRate } from "../exchange-rates/exchange-rates.service";
import type { ProductRow } from "../products/products.repository";
import { formatUsdAmount, priceKey, rateFormat } from "./invoice-format";
import type { SaleLine, SaleRequest } from "./sale.types";
import { requireProduct } from "./sale-products";
import { SALE_ERROR_MESSAGE } from "./sale-validation";

const STALE_SALE_MESSAGE =
  "Los precios, la tasa o el IVA cambiaron desde que revisaste la venta. Revisa el nuevo total y confirma de nuevo.";
const NO_RATE_FOR_SALE_MESSAGE =
  "No hay tasa de cambio disponible: no se puede vender sin tasa. Fija una tasa manual en Configuración para continuar.";

export function rateForSale(db: Database): number {
  try {
    return getCurrentRate(db).rate;
  } catch (err) {
    if (err instanceof ConflictError) throw new ConflictError(NO_RATE_FOR_SALE_MESSAGE);
    throw err;
  }
}

export function assertCustomerExists(customerId: number | null, db: Database): void {
  if (customerId === null || findCustomerById(customerId, db)) return;
  throw new BadRequestError(SALE_ERROR_MESSAGE, { customer_id: "El cliente no existe" });
}

function changedPrices(lines: readonly SaleLine[], products: Map<number, ProductRow>): ErrorDetails {
  const details: ErrorDetails = {};
  for (const line of lines) {
    const product = requireProduct(products, line.product_id);
    const expected = line.expected_price_usd_cents;
    if (expected === undefined || expected === product.price_usd_cents) continue;
    details[priceKey(product.id)] =
      `${product.name}: el precio cambió de ${formatUsdAmount(expected)} a ${formatUsdAmount(product.price_usd_cents)}`;
  }
  return details;
}

export function assertSaleUnchanged(
  sale: SaleRequest,
  products: Map<number, ProductRow>,
  rate: number,
  taxPercent: number,
): void {
  const details = changedPrices(sale.lines, products);
  if (sale.expected_rate !== null && sale.expected_rate !== rate) {
    details.rate = `La tasa vigente ahora es Bs ${rateFormat.format(rate)} por $`;
  }
  if (sale.expected_tax_percent !== null && sale.expected_tax_percent !== taxPercent) {
    details.tax_percent = `El IVA configurado ahora es ${rateFormat.format(taxPercent)} %`;
  }
  if (Object.keys(details).length > 0) throw new ConflictError(STALE_SALE_MESSAGE, details);
}
