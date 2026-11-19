import { beforeEach, expect, test } from "bun:test";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http-errors";
import { bsToUsd, usdToBs } from "../../lib/money";
import { getCustomer } from "../customers/customers.service";
import { getInvoice, voidInvoice } from "../invoices/invoices.service";
import { createPaymentsFixture, errorOf, type PaymentsFixture } from "./payments.test-support";

let fx: PaymentsFixture;

beforeEach(() => {
  fx = createPaymentsFixture();
});

test("abono parcial en USD: guarda ambos montos y la tasa y deja la factura pendiente", () => {
  const invoiceId = fx.sale(10);
  const { payment, invoice } = fx.pay(invoiceId, { amount: 4, currency: "USD", notes: "Efectivo" });
  expect(payment).toMatchObject({
    invoice_id: invoiceId,
    amount_usd_cents: 400,
    amount_bs_cents: 14600,
    currency: "USD",
    rate: 36.5,
    notes: "Efectivo",
  });
  expect(invoice.status).toBe("pending");
  expect(invoice.balance_usd_cents).toBe(600);
  expect(invoice.payments).toHaveLength(1);
  expect(getCustomer(fx.customerId, fx.db).balance_usd_cents).toBe(600);
});

test("saldar: al llegar a 0 la factura pasa a pagada y no admite más abonos", () => {
  const invoiceId = fx.sale(10);
  fx.pay(invoiceId, { amount: 4, currency: "USD" });
  const { invoice } = fx.pay(invoiceId, { amount: 6, currency: "USD" });
  expect(invoice.status).toBe("paid");
  expect(invoice.balance_usd_cents).toBe(0);
  expect(getCustomer(fx.customerId, fx.db).balance_usd_cents).toBe(0);
  const err = errorOf(() => fx.pay(invoiceId, { amount: 1, currency: "USD" }));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toContain("ya está pagada");
});

test("exceso: 409 con el saldo disponible y sin registrar nada", () => {
  const invoiceId = fx.sale(10);
  fx.pay(invoiceId, { amount: 7, currency: "USD" });
  const err = errorOf(() => fx.pay(invoiceId, { amount: 3.01, currency: "USD" }));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toContain("$ 3,00");
  expect(err.message).toContain("Bs 109,50");
  expect(err.details?.amount).toContain("$ 3,00");
  const bsErr = errorOf(() => fx.pay(invoiceId, { amount: 200, currency: "VES" }));
  expect(bsErr.details?.amount).toStartWith("Como máximo Bs 109,50");
  expect(getInvoice(invoiceId, fx.db).payments).toHaveLength(1);
});

test("abono en Bs: convierte con la tasa vigente y guarda los Bs tal como se recibieron", () => {
  const invoiceId = fx.sale(10);
  fx.setRate(40);
  const { payment, invoice } = fx.pay(invoiceId, { amount: 100, currency: "VES" });
  expect(payment).toMatchObject({ amount_bs_cents: 10000, amount_usd_cents: 250, currency: "VES", rate: 40 });
  expect(invoice.balance_usd_cents).toBe(750);
});

test("Bs con redondeo: una diferencia de 1 centavo al convertir salda exacto", () => {
  fx.setRate(36.5021);
  const invoiceId = fx.sale(10);
  const below = usdToBs(1000, 36.5021) - 22;
  expect(bsToUsd(below, 36.5021)).toBe(999);
  const { payment, invoice } = fx.pay(invoiceId, { amount: below / 100, currency: "VES" });
  expect(payment.amount_usd_cents).toBe(1000);
  expect(payment.amount_bs_cents).toBe(below);
  expect(invoice.status).toBe("paid");

  const other = fx.sale(10);
  const above = usdToBs(1000, 36.5021) + 22;
  expect(bsToUsd(above, 36.5021)).toBe(1001);
  expect(fx.pay(other, { amount: above / 100, currency: "VES" }).invoice.status).toBe("paid");

  const third = fx.sale(10);
  const farAbove = usdToBs(1002, 36.5021);
  expect(errorOf(() => fx.pay(third, { amount: farAbove / 100, currency: "VES" }))).toBeInstanceOf(ConflictError);
});

test("un abono en USD que excede por 1 centavo no se tolera", () => {
  const invoiceId = fx.sale(10);
  expect(errorOf(() => fx.pay(invoiceId, { amount: 10.01, currency: "USD" }))).toBeInstanceOf(ConflictError);
});

test("Bs que equivalen a menos de un centavo: 400", () => {
  const invoiceId = fx.sale(10);
  const err = errorOf(() => fx.pay(invoiceId, { amount: 0.01, currency: "VES" }));
  expect(err).toBeInstanceOf(BadRequestError);
  expect(err.details?.amount).toContain("demasiado pequeño");
});

test("solo facturas fiadas pendientes: contado, anulada e inexistente fallan", () => {
  const cash = fx.sale(10, "cash");
  expect(errorOf(() => fx.pay(cash, { amount: 1, currency: "USD" })).message).toContain("contado");
  const voided = fx.sale(10);
  voidInvoice(voided, {}, fx.db);
  expect(errorOf(() => fx.pay(voided, { amount: 1, currency: "USD" })).message).toContain("anulada");
  expect(errorOf(() => fx.pay(9999, { amount: 1, currency: "USD" }))).toBeInstanceOf(NotFoundError);
});

test("409 si la tasa cambió respecto a la que vio el operador", () => {
  const invoiceId = fx.sale(10);
  const err = errorOf(() => fx.pay(invoiceId, { amount: 1, currency: "USD", expected_rate: 30 }));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.details?.rate).toContain("36,50");
  const accepted = fx.pay(invoiceId, { amount: 1, currency: "USD", expected_rate: 36.5 });
  expect(accepted.invoice.balance_usd_cents).toBe(900);
});
