import { beforeEach, expect, test } from "bun:test";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { bsToUsd, usdToBs } from "../../lib/money";
import { getCustomer } from "../customers/customers.service";
import { getInvoice } from "../invoices/invoices.service";
import { recordCustomerPayment } from "./payments.service";
import { createPaymentsFixture, errorOf, type PaymentsFixture } from "./payments.test-support";

let fx: PaymentsFixture;

beforeEach(() => {
  fx = createPaymentsFixture();
});

function threeInvoices(): { newest: number; oldest: number; middle: number } {
  const newest = fx.sale(10);
  const oldest = fx.sale(20);
  const middle = fx.sale(5);
  fx.setCreatedAt(newest, "2026-10-03T12:00:00.000Z");
  fx.setCreatedAt(oldest, "2026-10-01T12:00:00.000Z");
  fx.setCreatedAt(middle, "2026-10-02T12:00:00.000Z");
  return { newest, oldest, middle };
}

function payAll(body: { amount: number; currency: "USD" | "VES" }) {
  return recordCustomerPayment(fx.customerId, body, fx.db);
}

test("reparte de la factura más antigua a la más reciente y salda las cubiertas", () => {
  const { newest, oldest, middle } = threeInvoices();
  fx.pay(oldest, { amount: 5, currency: "USD" });
  const result = payAll({ amount: 22, currency: "USD" });
  expect(result.payments.map((p) => [p.invoice_id, p.amount_usd_cents, p.invoice_settled])).toEqual([
    [oldest, 1500, true],
    [middle, 500, true],
    [newest, 200, false],
  ]);
  expect(result.amount_usd_cents).toBe(2200);
  expect(result.customer.balance_usd_cents).toBe(800);
  expect(getInvoice(oldest, fx.db).status).toBe("paid");
  expect(getInvoice(middle, fx.db).status).toBe("paid");
  expect(getInvoice(newest, fx.db)).toMatchObject({ status: "pending", balance_usd_cents: 800 });
});

test("en Bs: la suma de los Bs de cada parte es exactamente lo recibido", () => {
  threeInvoices();
  const received = 73_013;
  const result = payAll({ amount: received / 100, currency: "VES" });
  expect(result.payments.reduce((sum, p) => sum + p.amount_bs_cents, 0)).toBe(received);
  expect(result.payments.reduce((sum, p) => sum + p.amount_usd_cents, 0)).toBe(bsToUsd(received, 36.5));
  expect(result.payments.every((p) => p.currency === "VES" && p.rate === 36.5)).toBe(true);
});

test("saldar todo en Bs con redondeo deja el saldo en 0", () => {
  fx.setRate(36.5021);
  threeInvoices();
  const bs = usdToBs(3500, 36.5021) - 22;
  const result = payAll({ amount: bs / 100, currency: "VES" });
  expect(result.customer.balance_usd_cents).toBe(0);
  expect(result.payments.every((p) => p.invoice_settled)).toBe(true);
});

test("exceso del saldo total, cliente sin deuda o inexistente fallan sin registrar nada", () => {
  threeInvoices();
  const err = errorOf(() => payAll({ amount: 35.01, currency: "USD" }));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.details?.amount).toContain("$ 35,00");
  expect(getCustomer(fx.customerId, fx.db).balance_usd_cents).toBe(3500);
  payAll({ amount: 35, currency: "USD" });
  expect(errorOf(() => payAll({ amount: 1, currency: "USD" })).message).toContain("no tiene saldo pendiente");
  const missing = errorOf(() => recordCustomerPayment(9999, { amount: 1, currency: "USD" }, fx.db));
  expect(missing).toBeInstanceOf(NotFoundError);
});
