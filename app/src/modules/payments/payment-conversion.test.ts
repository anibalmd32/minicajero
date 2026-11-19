import { expect, test } from "bun:test";
import { allocateFifo, fitToBalance } from "./payments.service";

test("allocateFifo no reparte más de lo abonado", () => {
  const invoices = [
    { id: 1, balance_usd_cents: 300 },
    { id: 2, balance_usd_cents: 300 },
  ];
  expect(allocateFifo(invoices, { amount_usd_cents: 100, amount_bs_cents: 3650 }, "USD", 36.5)).toEqual([
    { invoice_id: 1, amount_usd_cents: 100, amount_bs_cents: 3650 },
  ]);
});

test("fitToBalance solo tolera la diferencia de redondeo en Bs", () => {
  expect(fitToBalance({ amount_usd_cents: 1001, amount_bs_cents: 1 }, "VES", 1000)?.amount_usd_cents).toBe(1000);
  expect(fitToBalance({ amount_usd_cents: 1001, amount_bs_cents: 1 }, "USD", 1000)).toBeNull();
  expect(fitToBalance({ amount_usd_cents: 1002, amount_bs_cents: 1 }, "VES", 1000)).toBeNull();
  expect(fitToBalance({ amount_usd_cents: 500, amount_bs_cents: 1 }, "VES", 1000)?.amount_usd_cents).toBe(500);
});
