import { expect, test } from "bun:test";
import { setManualRate } from "../exchange-rates/exchange-rates.service";
import { recordInvoicePayment } from "../payments/payments.service";
import { updateProduct } from "../products/products.service";
import { updateSettings } from "../settings/settings.service";
import { customer, dashboard, db, product, sell, useDashboardDatabase } from "./dashboard.test-support";

useDashboardDatabase();

function createDebts(): { ana: number; luis: number } {
  setManualRate({ rate: 40 }, db());
  const queso = product({ name: "Queso", price_usd: 10, stock: 100 });
  const ana = customer("10000001", "Ana");
  const luis = customer("10000002", "Luis");
  const eva = customer("10000003", "Eva");
  const credit = (customerId: number, quantity: number) => ({
    payment_type: "credit",
    customer_id: customerId,
    items: [{ product_id: queso, quantity }],
  });
  const anaFirst = sell(credit(ana, 2), "2026-10-20T15:00:00.000Z");
  sell(credit(ana, 1), "2026-10-25T15:00:00.000Z");
  sell(credit(luis, 4), "2026-10-26T15:00:00.000Z");
  const evaDebt = sell(credit(eva, 1), "2026-10-27T15:00:00.000Z");
  recordInvoicePayment(anaFirst, { amount: 5, currency: "USD" }, db());
  recordInvoicePayment(evaDebt, { amount: 10, currency: "USD" }, db());
  setManualRate({ rate: 50 }, db());
  return { ana, luis };
}

test("por cobrar con saldo en USD y su Bs a la tasa vigente", () => {
  createDebts();
  expect(dashboard().receivables).toEqual({
    total_usd_cents: 6_500,
    total_bs_cents: 325_000,
    debtors: 2,
    pending_invoices: 3,
  });
});

test("top deudores ordenados por saldo", () => {
  const { ana, luis } = createDebts();
  expect(dashboard().top_debtors).toEqual([
    {
      id: luis,
      name: "Luis Pérez",
      document: "V-10000002",
      balance_usd_cents: 4_000,
      balance_bs_cents: 200_000,
      pending_invoices: 1,
      oldest_pending_at: "2026-10-26T15:00:00.000Z",
    },
    {
      id: ana,
      name: "Ana Pérez",
      document: "V-10000001",
      balance_usd_cents: 2_500,
      balance_bs_cents: 125_000,
      pending_invoices: 2,
      oldest_pending_at: "2026-10-20T15:00:00.000Z",
    },
  ]);
});

test("stock bajo solo de productos activos según el umbral configurado", () => {
  updateSettings({ low_stock_threshold: 3, business_name: "Bodega" }, db());
  product({ name: "A", price_usd: 1, stock: 0 });
  product({ name: "B", price_usd: 1, stock: 3 });
  product({ name: "C", price_usd: 1, stock: 4 });
  const inactive = product({ name: "D", price_usd: 1, stock: 1 });
  updateProduct(inactive, { name: "D", price_usd: 1, active: false }, db());

  const result = dashboard();
  expect(result.stock).toEqual({ threshold: 3, low_stock: 2, out_of_stock: 1 });
  expect(result.setup).toMatchObject({ products: 4, business_configured: true, has_rate: false });
});

test("limita las facturas recientes y los deudores", () => {
  setManualRate({ rate: 40 }, db());
  const pan = product({ name: "Pan", price_usd: 1, stock: 1_000 });
  for (let index = 0; index < 7; index += 1) {
    const id = customer(String(20000000 + index), `Cliente ${"ABCDEFG"[index]}`);
    const items = [{ product_id: pan, quantity: index + 1 }];
    sell({ payment_type: "credit", customer_id: id, items }, "2026-10-29T12:00:00.000Z");
  }
  for (let index = 0; index < 3; index += 1) {
    sell({ payment_type: "cash", items: [{ product_id: pan, quantity: 1 }] }, "2026-10-29T13:00:00.000Z");
  }
  const result = dashboard();
  expect(result.recent_invoices).toHaveLength(8);
  expect(result.recent_invoices[0]?.number).toBe(10);
  expect(result.top_debtors.map((debtor) => debtor.balance_usd_cents)).toEqual([700, 600, 500, 400, 300]);
  expect(result.receivables.debtors).toBe(7);
});
