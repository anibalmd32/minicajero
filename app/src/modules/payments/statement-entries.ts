import type { StatementEntry, StatementInvoiceRow, StatementPaymentRow } from "./statement.types";

function invoiceEntry(invoice: StatementInvoiceRow): StatementEntry {
  const isCash = invoice.payment_type === "cash";
  return {
    kind: "invoice",
    date: invoice.created_at,
    invoice_id: invoice.id,
    invoice_number: invoice.number,
    invoice_status: invoice.status,
    payment_type: invoice.payment_type,
    payment_id: null,
    currency: null,
    rate: invoice.rate,
    notes: null,
    charge_usd_cents: invoice.total_usd_cents,
    charge_bs_cents: invoice.total_bs_cents,
    credit_usd_cents: isCash ? invoice.total_usd_cents : 0,
    credit_bs_cents: isCash ? invoice.total_bs_cents : 0,
    balance_usd_cents: 0,
    counts: invoice.status !== "void",
  };
}

function paymentEntry(payment: StatementPaymentRow): StatementEntry {
  return {
    kind: "payment",
    date: payment.created_at,
    invoice_id: payment.invoice_id,
    invoice_number: payment.invoice_number,
    invoice_status: payment.invoice_status,
    payment_type: null,
    payment_id: payment.id,
    currency: payment.currency,
    rate: payment.rate,
    notes: payment.notes,
    charge_usd_cents: 0,
    charge_bs_cents: 0,
    credit_usd_cents: payment.amount_usd_cents,
    credit_bs_cents: payment.amount_bs_cents,
    balance_usd_cents: 0,
    counts: payment.invoice_status !== "void",
  };
}

function compareEntries(a: StatementEntry, b: StatementEntry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === "invoice" ? -1 : 1;
  return (a.payment_id ?? a.invoice_id) - (b.payment_id ?? b.invoice_id);
}

/** Ordena los movimientos por fecha (la factura antes que sus abonos) y calcula el saldo acumulado. */
export function buildStatementEntries(
  invoices: readonly StatementInvoiceRow[],
  payments: readonly StatementPaymentRow[],
): StatementEntry[] {
  const entries = [...invoices.map(invoiceEntry), ...payments.map(paymentEntry)].sort(compareEntries);
  let balance = 0;
  for (const entry of entries) {
    if (entry.counts) balance += entry.charge_usd_cents - entry.credit_usd_cents;
    entry.balance_usd_cents = balance;
  }
  return entries;
}
