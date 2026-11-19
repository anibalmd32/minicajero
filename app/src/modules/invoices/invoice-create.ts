import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { JsonObject } from "../../lib/request";
import { getIvaPercent } from "../settings/settings.service";
import { getInvoice } from "./invoice-detail";
import type { InvoiceDetail } from "./invoice-listing.types";
import { insertInvoice, insertInvoiceItem, nextInvoiceNumber } from "./invoices.repository";
import type { SaleRequest } from "./sale.types";
import { assertCustomerExists, assertSaleUnchanged, rateForSale } from "./sale-checks";
import { assertStockAvailable, loadProducts } from "./sale-products";
import { buildSnapshot } from "./sale-snapshot";
import { discountStock } from "./sale-stock";
import { validateSale } from "./sale-validation";

function registerSale(sale: SaleRequest, db: Database): number {
  assertCustomerExists(sale.customer_id, db);
  const rate = rateForSale(db);
  const products = loadProducts(sale.lines, db);
  assertStockAvailable(sale.lines, products);
  const taxPercent = getIvaPercent(db);
  assertSaleUnchanged(sale, products, rate, taxPercent);
  const { items, ...amounts } = buildSnapshot(sale.lines, products, rate, taxPercent);
  const number = nextInvoiceNumber(db);
  const invoiceId = insertInvoice(
    {
      ...amounts,
      number,
      customer_id: sale.customer_id,
      payment_type: sale.payment_type,
      status: sale.payment_type === "cash" ? "paid" : "pending",
      notes: sale.notes,
    },
    db,
  );
  for (const item of items) insertInvoiceItem(invoiceId, item, db);
  discountStock(number, items, db);
  return invoiceId;
}

/**
 * Registra una venta en una sola transacción con bloqueo de escritura: valida cliente, productos activos y stock
 * (409 con el disponible por producto si no alcanza), toma la tasa vigente (409 si no hay) y el IVA configurado,
 * comprueba que precios, tasa e IVA sigan siendo los que vio el operador si los envió (409 con `prices.<id>`, `rate`
 * o `tax_percent` si cambiaron), fija el snapshot de montos (ver `calculateSaleSnapshot`), asigna el número correlativo, descuenta el stock
 * (registrando el movimiento) y deja la factura `paid` si es de contado o `pending` si es fiada.
 */
export function createInvoice(body: JsonObject, db: Database = getDb()): InvoiceDetail {
  const sale = validateSale(body);
  const id = db.transaction(() => registerSale(sale, db)).immediate();
  return getInvoice(id, db);
}
