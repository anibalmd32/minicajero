import { beforeEach, expect, test } from "bun:test";
import { NotFoundError } from "../../lib/http-errors";
import { voidInvoice } from "../invoices/invoices.service";
import { buildStatementEntries, getCustomerStatement } from "./payments.service";
import { createPaymentsFixture, errorOf, type PaymentsFixture } from "./payments.test-support";

let fx: PaymentsFixture;

beforeEach(() => {
  fx = createPaymentsFixture();
});

function seedStatement() {
  const credit = fx.sale(10);
  const cash = fx.sale(3, "cash");
  const voided = fx.sale(7);
  fx.setCreatedAt(credit, "2026-10-01T10:00:00.000Z");
  fx.setCreatedAt(cash, "2026-10-02T10:00:00.000Z");
  fx.setCreatedAt(voided, "2026-10-03T10:00:00.000Z");
  fx.pay(credit, { amount: 4, currency: "USD" });
  voidInvoice(voided, {}, fx.db);
  fx.sale(1, "cash", null);
  return { credit, cash, voided };
}

test("lista facturas (fiadas y de contado) y abonos en orden cronológico con saldo acumulado", () => {
  const { credit, cash, voided } = seedStatement();
  const statement = getCustomerStatement(fx.customerId, fx.db);
  expect(statement.entries.map((e) => [e.kind, e.invoice_id, e.balance_usd_cents, e.counts])).toEqual([
    ["invoice", credit, 1000, true],
    ["invoice", cash, 1000, true],
    ["invoice", voided, 1000, false],
    ["payment", credit, 600, true],
  ]);
  expect(statement.entries[1]).toMatchObject({ charge_usd_cents: 300, credit_usd_cents: 300, payment_type: "cash" });
  expect(statement.entries.at(-1)?.balance_usd_cents).toBe(statement.customer.balance_usd_cents);
});

test("el resumen cuenta solo lo vigente y lista las facturas pendientes", () => {
  const { credit } = seedStatement();
  const statement = getCustomerStatement(fx.customerId, fx.db);
  expect(statement.summary).toMatchObject({
    balance_usd_cents: 600,
    credit_sales_usd_cents: 1000,
    cash_sales_usd_cents: 300,
    payments_usd_cents: 400,
    invoices: 2,
    pending_invoices: 1,
    oldest_pending_at: "2026-10-01T10:00:00.000Z",
  });
  expect(statement.pending_invoices.map((i) => [i.id, i.balance_usd_cents])).toEqual([[credit, 600]]);
});

test("404 si el cliente no existe", () => {
  expect(errorOf(() => getCustomerStatement(9999, fx.db))).toBeInstanceOf(NotFoundError);
});

const sameDate = "2026-10-01T10:00:00.000Z";
const sameDateInvoice = {
  id: 1,
  number: 1,
  status: "pending",
  payment_type: "credit",
  rate: 1,
  total_usd_cents: 500,
  total_bs_cents: 500,
  created_at: sameDate,
  voided_at: null,
} as const;
const sameDatePayment = {
  id: 1,
  invoice_id: 1,
  amount_usd_cents: 200,
  amount_bs_cents: 200,
  currency: "USD",
  rate: 1,
  notes: null,
  created_at: sameDate,
  invoice_number: 1,
  invoice_status: "pending",
} as const;

test("buildStatementEntries pone la factura antes que su abono si comparten fecha", () => {
  const entries = buildStatementEntries([sameDateInvoice], [sameDatePayment]);
  expect(entries.map((e) => [e.kind, e.balance_usd_cents])).toEqual([
    ["invoice", 500],
    ["payment", 300],
  ]);
});
