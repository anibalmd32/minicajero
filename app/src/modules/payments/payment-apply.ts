import type { Database } from "bun:sqlite";
import type { InvoiceRow } from "../invoices/invoices.types";
import { findPaymentById, insertPayment, setCreditInvoiceStatus } from "./payments.repository";
import type { PaymentAmounts, PaymentRequest } from "./payments.types";

export function applyPayment(
  invoice: Pick<InvoiceRow, "id" | "balance_usd_cents">,
  amounts: PaymentAmounts,
  request: PaymentRequest,
  rate: number,
  db: Database,
): number {
  const paymentId = insertPayment(
    { invoice_id: invoice.id, ...amounts, currency: request.currency, rate, notes: request.notes },
    db,
  );
  if (amounts.amount_usd_cents >= invoice.balance_usd_cents) setCreditInvoiceStatus(invoice.id, "paid", db);
  return paymentId;
}

export function requirePayment(id: number, db: Database) {
  const payment = findPaymentById(id, db);
  if (!payment) throw new Error("No se encontró el abono recién registrado");
  return payment;
}
