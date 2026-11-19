import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { createTestDatabase } from "../../test-support/test-database";
import { getCustomer } from "../customers/customers.service";
import { adjustStock, getStockMovements, updateProduct } from "../products/products.service";
import { updateSettings } from "../settings/settings.service";
import { voidInvoice } from "./invoices.service";
import {
  addPayment,
  cashSale,
  customer,
  errorOf,
  page,
  product,
  sell,
  setRate,
  stockOf,
} from "./invoices.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function sellOnCredit(priceUsd: number, quantity: number) {
  const ana = customer(db);
  const queso = product(db, { name: "Queso", price_usd: priceUsd, stock: 3 });
  const invoice = sell(db, {
    payment_type: "credit",
    customer_id: ana,
    items: [{ product_id: queso, quantity }],
  });
  return { ana, queso, invoice };
}

test("anula, guarda fecha y motivo y devuelve el stock", () => {
  setRate(db, 40);
  const harina = product(db, { name: "Harina", price_usd: 1, stock: 10 });
  const arroz = product(db, { name: "Arroz", price_usd: 2, stock: 5 });
  const invoice = sell(db, {
    payment_type: "cash",
    items: [
      { product_id: harina, quantity: 4 },
      { product_id: arroz, quantity: 5 },
    ],
  });
  expect([stockOf(db, harina), stockOf(db, arroz)]).toEqual([6, 0]);
  const voided = voidInvoice(invoice.id, { reason: "  Error  de cobro " }, db);
  expect(voided).toMatchObject({
    status: "void",
    void_reason: "Error de cobro",
    refund_usd_cents: 0,
    refund_bs_cents: 0,
    warning: null,
    total_usd_cents: 1400,
    balance_usd_cents: 0,
  });
  expect(voided.voided_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect([stockOf(db, harina), stockOf(db, arroz)]).toEqual([10, 5]);
});

test("la anulación registra el movimiento de stock de cada producto", () => {
  setRate(db, 40);
  const arroz = product(db, { name: "Arroz", price_usd: 2, stock: 5 });
  const invoice = sell(db, cashSale(arroz, 5));
  voidInvoice(invoice.id, {}, db);
  expect(getStockMovements(arroz, page, db).items[0]).toMatchObject({
    delta: 5,
    stock_after: 5,
    reason: `Anulación factura #${invoice.number}`,
  });
});

test("devuelve el stock aunque el producto se haya desactivado o ajustado después", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const invoice = sell(db, cashSale(pan, 2));
  adjustStock(pan, { set: 0, reason: "Merma" }, db);
  updateProduct(pan, { name: "Pan", price_usd: 1, active: false }, db);
  voidInvoice(invoice.id, {}, db);
  expect(stockOf(db, pan)).toBe(2);
});

test("409 si ya estaba anulada (sin devolver el stock dos veces) y 404 si no existe", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const invoice = sell(db, cashSale(pan, 2));
  voidInvoice(invoice.id, {}, db);
  const err = errorOf(() => voidInvoice(invoice.id, {}, db));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toBe(`La factura #${invoice.number} ya está anulada`);
  expect(stockOf(db, pan)).toBe(5);
  expect(errorOf(() => voidInvoice(999, {}, db))).toBeInstanceOf(NotFoundError);
});

test("valida el motivo", () => {
  expect(errorOf(() => voidInvoice(1, { reason: "x".repeat(201) }, db)).details).toEqual({
    reason: "Debe tener como máximo 200 caracteres",
  });
});

test("fiada con abonos: se permite anular, conserva los abonos e indica el monto a reintegrar", () => {
  setRate(db, 40);
  const { ana, queso, invoice } = sellOnCredit(5, 2);
  addPayment(db, invoice.id, 350);
  expect(getCustomer(ana, db).balance_usd_cents).toBe(650);
  const voided = voidInvoice(invoice.id, {}, db);
  expect(voided).toMatchObject({
    status: "void",
    payments_usd_cents: 350,
    payments_bs_cents: 14_000,
    balance_usd_cents: 0,
    refund_usd_cents: 350,
    refund_bs_cents: 14_000,
  });
  expect(voided.payments).toHaveLength(1);
  expect(voided.warning).toBe(
    `La factura #${invoice.number} tenía abonos por $ 3,50 (Bs 140,00). ` +
      "Los abonos quedan registrados y no se reintegran automáticamente: devuélvelos al cliente si corresponde.",
  );
  expect(getCustomer(ana, db).balance_usd_cents).toBe(0);
  expect(stockOf(db, queso)).toBe(3);
});

test("el reintegro en Bs suma los Bs recibidos en cada abono con su tasa y el aviso sigue la moneda principal", () => {
  setRate(db, 40);
  updateSettings({ display_currency: "VES" }, db);
  const { invoice } = sellOnCredit(500, 1);
  addPayment(db, invoice.id, 100, "VES", 36.54);
  addPayment(db, invoice.id, 3000, "USD", 41);
  const voided = voidInvoice(invoice.id, {}, db);
  expect(voided).toMatchObject({ refund_usd_cents: 3100, refund_bs_cents: 3654 + 123_000 });
  expect(voided.warning).toStartWith(`La factura #${invoice.number} tenía abonos por Bs 1.266,54 ($ 31,00). `);
});
