import type { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { HttpError } from "../../lib/http-errors";
import { usdToBs } from "../../lib/money";
import type { JsonObject } from "../../lib/request";
import { createCustomer } from "../customers/customers.service";
import { setManualRate } from "../exchange-rates/exchange-rates.service";
import { createProduct, getProduct } from "../products/products.service";
import type { InvoiceQuery } from "./invoice-listing.types";
import { createInvoice, searchInvoices } from "./invoices.service";

export const page = { limit: 50, offset: 0 };

export function errorOf(action: () => unknown): HttpError {
  try {
    action();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return err as HttpError;
  }
  throw new Error("Se esperaba un error HTTP");
}

export function setRate(db: Database, rate: number): void {
  setManualRate({ rate }, db);
}

export function product(db: Database, body: JsonObject): number {
  return createProduct(body, db).id;
}

export function customer(db: Database, docNumber = "12345678", firstName = "Ana", lastName = "Pérez"): number {
  return createCustomer({ first_name: firstName, last_name: lastName, doc_type: "V", doc_number: docNumber }, db).id;
}

export function sell(db: Database, body: JsonObject) {
  return createInvoice(body, db);
}

export function cashSale(productId: number, quantity = 1): JsonObject {
  return { payment_type: "cash", items: [{ product_id: productId, quantity }] };
}

export function search(db: Database, query: Partial<InvoiceQuery> = {}) {
  const empty: InvoiceQuery = { q: null, status: null, payment_type: null, customer_id: null, from: null, to: null };
  return searchInvoices({ ...empty, ...query }, page, db);
}

export function stockOf(db: Database, productId: number): number {
  return getProduct(productId, db).stock;
}

export function invoiceCount(db: Database): number {
  return db.query<{ total: number }, []>("SELECT COUNT(*) AS total FROM invoices").get()?.total ?? 0;
}

export function setCreatedAt(db: Database, invoiceId: number, createdAt: string): void {
  db.query("UPDATE invoices SET created_at = ? WHERE id = ?").run(createdAt, invoiceId);
}

export function addPayment(
  db: Database,
  invoiceId: number,
  amountUsdCents: number,
  currency: "USD" | "VES" = "USD",
  rate = 40,
): void {
  db.query(
    `INSERT INTO payments (invoice_id, amount_usd_cents, amount_bs_cents, currency, rate)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(invoiceId, amountUsdCents, usdToBs(amountUsdCents, rate), currency, rate);
}
