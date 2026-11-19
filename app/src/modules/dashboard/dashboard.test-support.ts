import type { Database } from "bun:sqlite";
import { beforeEach } from "bun:test";
import type { JsonObject } from "../../lib/request";
import { createTestDatabase } from "../../test-support/test-database";
import { createCustomer } from "../customers/customers.service";
import { createInvoice } from "../invoices/invoices.service";
import { createProduct } from "../products/products.service";
import { getDashboard } from "./dashboard.service";

let current: Database;

export const NOW = Date.parse("2026-10-29T15:00:00.000Z");

export function useDashboardDatabase(): void {
  beforeEach(() => {
    current = createTestDatabase();
  });
}

export function db(): Database {
  return current;
}

export function product(body: JsonObject): number {
  return createProduct(body, current).id;
}

export function customer(docNumber: string, firstName: string): number {
  return createCustomer({ first_name: firstName, last_name: "Pérez", doc_type: "V", doc_number: docNumber }, current)
    .id;
}

export function sell(body: JsonObject, createdAt: string): number {
  const invoice = createInvoice(body, current);
  current.query("UPDATE invoices SET created_at = ? WHERE id = ?").run(createdAt, invoice.id);
  return invoice.id;
}

export function dashboard() {
  return getDashboard(current, NOW);
}
