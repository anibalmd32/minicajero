import { beforeEach, expect, test } from "bun:test";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { getCustomer, searchCustomers } from "../customers/customers.service";
import { voidInvoice } from "../invoices/invoices.service";
import { deletePayment } from "./payments.service";
import { createPaymentsFixture, errorOf, type PaymentsFixture } from "./payments.test-support";

let fx: PaymentsFixture;

beforeEach(() => {
  fx = createPaymentsFixture();
});

test("elimina el abono y la factura pagada vuelve a pendiente", () => {
  const invoiceId = fx.sale(10);
  fx.pay(invoiceId, { amount: 4, currency: "USD" });
  const { payment } = fx.pay(invoiceId, { amount: 6, currency: "USD" });
  const invoice = deletePayment(payment.id, fx.db);
  expect(invoice.status).toBe("pending");
  expect(invoice.balance_usd_cents).toBe(600);
  expect(invoice.payments).toHaveLength(1);
  expect(getCustomer(fx.customerId, fx.db).balance_usd_cents).toBe(600);
});

test("revertir un abono parcial mantiene la factura pendiente", () => {
  const invoiceId = fx.sale(10);
  const { payment } = fx.pay(invoiceId, { amount: 4, currency: "USD" });
  expect(deletePayment(payment.id, fx.db)).toMatchObject({ status: "pending", balance_usd_cents: 1000 });
});

test("404 si no existe y 409 si la factura está anulada", () => {
  expect(errorOf(() => deletePayment(9999, fx.db))).toBeInstanceOf(NotFoundError);
  const invoiceId = fx.sale(10);
  const { payment } = fx.pay(invoiceId, { amount: 4, currency: "USD" });
  voidInvoice(invoiceId, {}, fx.db);
  expect(errorOf(() => deletePayment(payment.id, fx.db))).toBeInstanceOf(ConflictError);
});

test("el filtro de deudores refleja los saldos reales tras abonar y revertir", () => {
  const debtors = () =>
    searchCustomers({ q: null, debtors: "1" }, { limit: 50, offset: 0 }, fx.db).items.map((c) => c.id);
  const invoiceId = fx.sale(10);
  expect(debtors()).toEqual([fx.customerId]);
  const { payment } = fx.pay(invoiceId, { amount: 10, currency: "USD" });
  expect(debtors()).toEqual([]);
  deletePayment(payment.id, fx.db);
  expect(debtors()).toEqual([fx.customerId]);
});
