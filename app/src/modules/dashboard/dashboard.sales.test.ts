import { expect, test } from "bun:test";
import { setManualRate } from "../exchange-rates/exchange-rates.service";
import { voidInvoice } from "../invoices/invoices.service";
import { dashboard, db, product, sell, useDashboardDatabase } from "./dashboard.test-support";

useDashboardDatabase();

function sellSampleSales(): void {
  setManualRate({ rate: 40 }, db());
  const pan = product({ name: "Pan", price_usd: 1, stock: 100 });
  const cash = (quantity: number) => ({ payment_type: "cash", items: [{ product_id: pan, quantity }] });
  sell(cash(2), "2026-10-29T04:30:00.000Z");
  sell(cash(1), "2026-10-29T03:59:00.000Z");
  setManualRate({ rate: 50 }, db());
  sell(cash(3), "2026-10-29T14:00:00.000Z");
  sell(cash(5), "2026-10-01T04:00:00.000Z");
  sell(cash(7), "2026-10-01T03:59:59.000Z");
  voidInvoice(sell(cash(9), "2026-10-29T12:00:00.000Z"), {}, db());
}

test("primera ejecución: todo en cero y sin tasa", () => {
  const result = dashboard();
  expect(result.today).toBe("2026-10-29");
  expect(result.month_start).toBe("2026-10-01");
  expect(result.setup).toEqual({
    products: 0,
    customers: 0,
    invoices: 0,
    business_configured: false,
    has_rate: false,
  });
  expect(result.exchange_rate.rate).toBeNull();
  expect(result.sales_today).toEqual({ invoices: 0, total_usd_cents: 0, total_bs_cents: 0 });
  expect(result.sales_recent_days).toHaveLength(7);
  expect(result.sales_recent_days.at(-1)?.date).toBe("2026-10-29");
  expect(result.receivables).toEqual({ total_usd_cents: 0, total_bs_cents: null, debtors: 0, pending_invoices: 0 });
  expect(result.recent_invoices).toEqual([]);
  expect(result.top_debtors).toEqual([]);
});

test("ventas de hoy y del mes por día de Caracas, con el snapshot Bs y sin anuladas", () => {
  sellSampleSales();
  const result = dashboard();
  expect(result.sales_today).toEqual({ invoices: 2, total_usd_cents: 500, total_bs_cents: 8_000 + 15_000 });
  expect(result.sales_month).toEqual({
    invoices: 4,
    total_usd_cents: 1_100,
    total_bs_cents: 8_000 + 4_000 + 15_000 + 25_000,
  });
});

test("serie de ventas recientes y facturas recientes", () => {
  sellSampleSales();
  const result = dashboard();
  expect(result.sales_recent_days.find((day) => day.date === "2026-10-28")).toEqual({
    date: "2026-10-28",
    invoices: 1,
    total_usd_cents: 100,
    total_bs_cents: 4_000,
  });
  expect(result.sales_recent_days.at(-1)).toMatchObject({ date: "2026-10-29", invoices: 2, total_usd_cents: 500 });
  expect(result.recent_invoices.map((invoice) => invoice.status)).toEqual([
    "void",
    "paid",
    "paid",
    "paid",
    "paid",
    "paid",
  ]);
});
