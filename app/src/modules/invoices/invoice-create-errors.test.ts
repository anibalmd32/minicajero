import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http-errors";
import { createTestDatabase } from "../../test-support/test-database";
import { updateProduct } from "../products/products.service";
import { updateSettings } from "../settings/settings.service";
import { getInvoice } from "./invoices.service";
import { cashSale, errorOf, invoiceCount, product, sell, setRate, stockOf } from "./invoices.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

test("cliente inexistente es 400", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const err = errorOf(() => sell(db, { ...cashSale(pan), customer_id: 999 }));
  expect(err).toBeInstanceOf(BadRequestError);
  expect(err.details).toEqual({ customer_id: "El cliente no existe" });
});

test("fiado sin cliente se rechaza sin tocar el stock", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const err = errorOf(() => sell(db, { payment_type: "credit", items: [{ product_id: pan, quantity: 1 }] }));
  expect(err).toBeInstanceOf(BadRequestError);
  expect(err.details).toEqual({ customer_id: "Para vender fiado debes indicar el cliente" });
  expect(stockOf(db, pan)).toBe(5);
  expect(invoiceCount(db)).toBe(0);
});

test("stock insuficiente: 409 con el disponible por producto (sumando líneas repetidas) y nada cambia", () => {
  setRate(db, 40);
  const harina = product(db, { name: "Harina", price_usd: 1, stock: 3 });
  const arroz = product(db, { name: "Arroz", price_usd: 1, stock: 0 });
  const azucar = product(db, { name: "Azúcar", price_usd: 1, stock: 10 });
  const err = errorOf(() =>
    sell(db, {
      payment_type: "cash",
      items: [
        { product_id: harina, quantity: 2 },
        { product_id: azucar, quantity: 1 },
        { product_id: harina, quantity: 2 },
        { product_id: arroz, quantity: 1 },
      ],
    }),
  );
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toBe("Stock insuficiente: Harina (disponible 3), Arroz (disponible 0)");
  expect(err.details).toEqual({
    [`products.${harina}`]: "Harina: disponible 3 unidades, solicitado 4 unidades",
    [`products.${arroz}`]: "Arroz: disponible 0 unidades, solicitado 1 unidad",
  });
  expect([stockOf(db, harina), stockOf(db, arroz), stockOf(db, azucar)]).toEqual([3, 0, 10]);
  expect(invoiceCount(db)).toBe(0);
});

test("productos inexistentes (400) o desactivados (409)", () => {
  setRate(db, 40);
  const viejo = product(db, { name: "Viejo", price_usd: 1, stock: 5, active: false });
  const missing = errorOf(() => sell(db, cashSale(999)));
  expect(missing).toBeInstanceOf(BadRequestError);
  expect(missing.details).toEqual({ "products.999": "El producto 999 no existe" });
  const inactive = errorOf(() => sell(db, cashSale(viejo)));
  expect(inactive).toBeInstanceOf(ConflictError);
  expect(inactive.details).toEqual({ [`products.${viejo}`]: "Viejo está desactivado" });
  expect(stockOf(db, viejo)).toBe(5);
});

test("sin tasa de cambio: 409 con mensaje claro y nada cambia", () => {
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const err = errorOf(() => sell(db, cashSale(pan)));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toContain("no se puede vender sin tasa");
  expect(stockOf(db, pan)).toBe(5);
  expect(invoiceCount(db)).toBe(0);
});

function changeEverythingAfterOperatorReview() {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1.5, stock: 5 });
  const leche = product(db, { name: "Leche", price_usd: 2, stock: 5 });
  updateProduct(pan, { name: "Pan", price_usd: 3 }, db);
  setRate(db, 50);
  updateSettings({ iva_percent: 16 }, db);
  return { pan, leche };
}

test("precios, tasa o IVA distintos de los que vio el operador: 409 con el detalle y nada cambia", () => {
  const { pan, leche } = changeEverythingAfterOperatorReview();
  const err = errorOf(() =>
    sell(db, {
      payment_type: "cash",
      expected_rate: 40,
      expected_tax_percent: 0,
      items: [
        { product_id: pan, quantity: 2, unit_price_usd_cents: 150 },
        { product_id: leche, quantity: 1, unit_price_usd_cents: 200 },
      ],
    }),
  );
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toContain("confirma de nuevo");
  expect(err.details).toEqual({
    [`prices.${pan}`]: "Pan: el precio cambió de $ 1,50 a $ 3,00",
    rate: "La tasa vigente ahora es Bs 50,00 por $",
    tax_percent: "El IVA configurado ahora es 16,00 %",
  });
  expect(stockOf(db, pan)).toBe(5);
  expect(invoiceCount(db)).toBe(0);
});

test("con los valores vigentes confirmados por el operador la venta se registra", () => {
  const { pan } = changeEverythingAfterOperatorReview();
  const invoice = sell(db, {
    payment_type: "cash",
    expected_rate: 50,
    expected_tax_percent: 16,
    items: [{ product_id: pan, quantity: 2, unit_price_usd_cents: 300 }],
  });
  expect(invoice).toMatchObject({ rate: 50, tax_percent: 16, subtotal_usd_cents: 600 });
});

test("404 para factura inexistente", () => {
  expect(errorOf(() => getInvoice(999, db))).toBeInstanceOf(NotFoundError);
});
