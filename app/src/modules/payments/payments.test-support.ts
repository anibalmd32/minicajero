import type { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { HttpError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { createTestDatabase } from "../../test-support/test-database";
import { createCustomer } from "../customers/customers.service";
import { setManualRate } from "../exchange-rates/exchange-rates.service";
import { createInvoice } from "../invoices/invoices.service";
import { createProduct } from "../products/products.service";
import { recordInvoicePayment } from "./payments.service";

export interface PaymentsFixture {
  db: Database;
  customerId: number;
  setRate(rate: number): void;
  sale(priceUsd: number, paymentType?: "cash" | "credit", customer?: number | null): number;
  pay(invoiceId: number, body: JsonObject): ReturnType<typeof recordInvoicePayment>;
  setCreatedAt(invoiceId: number, createdAt: string): void;
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

/** Base de datos con tasa 36,5 y el cliente Ana Pérez, más atajos para vender, abonar y fechar facturas. */
export function createPaymentsFixture(): PaymentsFixture {
  const db = createTestDatabase();
  const setRate = (rate: number) => setManualRate({ rate }, db);
  setRate(36.5);
  const customerId = createCustomer(
    { first_name: "Ana", last_name: "Pérez", doc_type: "V", doc_number: "12345678" },
    db,
  ).id;
  return {
    db,
    customerId,
    setRate,
    sale(priceUsd, paymentType = "credit", customer = customerId) {
      const productId = createProduct(
        { name: `Producto ${priceUsd}-${Math.random()}`, price_usd: priceUsd, stock: 10 },
        db,
      ).id;
      return createInvoice(
        { payment_type: paymentType, customer_id: customer, items: [{ product_id: productId, quantity: 1 }] },
        db,
      ).id;
    },
    pay: (invoiceId, body) => recordInvoicePayment(invoiceId, body, db),
    setCreatedAt(invoiceId, createdAt) {
      db.query("UPDATE invoices SET created_at = ? WHERE id = ?").run(createdAt, invoiceId);
    },
  };
}
