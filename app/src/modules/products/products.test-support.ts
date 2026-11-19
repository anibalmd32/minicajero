import type { Database } from "bun:sqlite";
import { beforeEach, expect } from "bun:test";
import { HttpError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { createTestDatabase } from "../../test-support/test-database";
import { createProduct, searchProducts } from "./products.service";

let current: Database;

export const page = { limit: 50, offset: 0 };

export const harina = { code: "har-001", name: "  Harina   PAN 1kg ", price_usd: 1.25, stock: 10 };

export function useProductsDatabase(): void {
  beforeEach(() => {
    current = createTestDatabase();
  });
}

export function db(): Database {
  return current;
}

export function errorOf(action: () => unknown): HttpError {
  try {
    action();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return err as HttpError;
  }
  throw new Error("Se esperaba un error HTTP");
}

export function search(query: Partial<{ q: string; active: string; low_stock: string; out_of_stock: string }> = {}) {
  return searchProducts({ q: null, active: null, low_stock: null, out_of_stock: null, ...query }, page, current);
}

export function create(body: JsonObject) {
  return createProduct(body, current);
}

export function addSale(productId: number): void {
  const invoice = current
    .query<{ id: number }, []>(
      `INSERT INTO invoices (number, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents, total_usd_cents,
         subtotal_bs_cents, tax_bs_cents, total_bs_cents)
       VALUES (1, 'paid', 'cash', 40, 100, 0, 100, 4000, 0, 4000) RETURNING id`,
    )
    .get();
  if (!invoice) throw new Error("No se pudo crear la factura de prueba");
  current
    .query(
      `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_usd_cents,
         unit_price_bs_cents, line_total_usd_cents, line_total_bs_cents)
       VALUES (?, ?, 'x', 1, 100, 4000, 100, 4000)`,
    )
    .run(invoice.id, productId);
}
