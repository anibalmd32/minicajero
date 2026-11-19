import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { createTestDatabase } from "../../test-support/test-database";
import { getStockMovements, updateProduct } from "../products/products.service";
import { updateSettings } from "../settings/settings.service";
import { getInvoice, voidInvoice } from "./invoices.service";
import { cashSale, customer, page, product, sell, setRate, stockOf } from "./invoices.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function sellMixedCashSale() {
  setRate(db, 36.5);
  updateSettings({ iva_percent: 16 }, db);
  const harina = product(db, { code: "HAR-1", name: "Harina PAN", price_usd: 1.25, stock: 10 });
  const arroz = product(db, { name: "Arroz", price_usd: 0.99, stock: 5 });
  const invoice = sell(db, {
    payment_type: "cash",
    items: [
      { product_id: harina, quantity: 2 },
      { product_id: arroz, quantity: 1 },
      { product_id: harina, quantity: 1 },
    ],
    notes: "Mostrador",
  });
  return { invoice, harina, arroz };
}

test("contado: snapshot con tasa e IVA vigentes y factura pagada", () => {
  const { invoice } = sellMixedCashSale();
  expect(invoice).toMatchObject({
    number: 1,
    status: "paid",
    payment_type: "cash",
    customer_id: null,
    customer: null,
    rate: 36.5,
    tax_percent: 16,
    subtotal_usd_cents: 474,
    tax_usd_cents: 76,
    total_usd_cents: 550,
    subtotal_bs_cents: 13_688 + 3614,
    tax_bs_cents: 2768,
    total_bs_cents: 17_302 + 2768,
    notes: "Mostrador",
    voided_at: null,
    payments_usd_cents: 0,
    payments_bs_cents: 0,
    balance_usd_cents: 0,
    items_count: 2,
    payments: [],
  });
});

test("contado: líneas agrupadas con su snapshot y stock descontado con movimiento", () => {
  const { invoice, harina, arroz } = sellMixedCashSale();
  expect(invoice.items).toMatchObject([
    {
      product_id: harina,
      product_code: "HAR-1",
      product_name: "Harina PAN",
      quantity: 3,
      unit_price_usd_cents: 125,
      unit_price_bs_cents: 4563,
      line_total_usd_cents: 375,
      line_total_bs_cents: 13_688,
    },
    { product_id: arroz, quantity: 1, unit_price_usd_cents: 99, line_total_bs_cents: 3614 },
  ]);
  expect(stockOf(db, harina)).toBe(7);
  expect(stockOf(db, arroz)).toBe(4);
  expect(getStockMovements(harina, page, db).items[0]).toMatchObject({
    delta: -3,
    stock_after: 7,
    reason: "Venta factura #1",
  });
});

test("fiado: queda pendiente con saldo igual al total y suma a la deuda del cliente", () => {
  setRate(db, 40);
  const ana = customer(db);
  const queso = product(db, { name: "Queso", price_usd: 5, stock: 3 });
  const invoice = sell(db, {
    payment_type: "credit",
    customer_id: ana,
    items: [{ product_id: queso, quantity: 2 }],
  });
  expect(invoice).toMatchObject({
    status: "pending",
    payment_type: "credit",
    customer_id: ana,
    total_usd_cents: 1000,
    total_bs_cents: 40_000,
    balance_usd_cents: 1000,
  });
  expect(invoice.customer).toMatchObject({ id: ana, document: "V-12345678", balance_usd_cents: 1000 });
});

test("contado admite cliente opcional", () => {
  setRate(db, 40);
  const ana = customer(db);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const invoice = sell(db, { ...cashSale(pan), customer_id: ana });
  expect(invoice).toMatchObject({ status: "paid", customer_id: ana, balance_usd_cents: 0 });
});

test("vender exactamente el stock disponible lo deja en 0", () => {
  setRate(db, 40);
  const harina = product(db, { name: "Harina", price_usd: 1, stock: 3 });
  sell(db, cashSale(harina, 3));
  expect(stockOf(db, harina)).toBe(0);
});

test("el snapshot no cambia aunque luego cambien el precio, el nombre, la tasa o el IVA", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 5 });
  const invoice = sell(db, cashSale(pan, 2));
  updateProduct(pan, { name: "Pan francés", price_usd: 3 }, db);
  setRate(db, 50);
  updateSettings({ iva_percent: 16 }, db);
  const again = getInvoice(invoice.id, db);
  expect(again).toMatchObject({ rate: 40, tax_percent: 0, total_usd_cents: 200, total_bs_cents: 8000 });
  expect(again.items[0]).toMatchObject({ product_name: "Pan", unit_price_usd_cents: 100, line_total_bs_cents: 8000 });
});

test("numeración correlativa: MAX + 1, sin reutilizar números de facturas anuladas", () => {
  setRate(db, 40);
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 10 });
  expect(sell(db, cashSale(pan)).number).toBe(1);
  const second = sell(db, cashSale(pan));
  expect(second.number).toBe(2);
  voidInvoice(second.id, {}, db);
  expect(sell(db, cashSale(pan)).number).toBe(3);
});
