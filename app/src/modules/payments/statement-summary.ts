import type { Customer } from "../customers/customers.types";
import type { PaymentType } from "../invoices/invoices.types";
import type { PendingInvoiceRow, StatementInvoiceRow, StatementPaymentRow, StatementSummary } from "./statement.types";

function sumActivePayments(
  payments: readonly StatementPaymentRow[],
  field: "amount_usd_cents" | "amount_bs_cents",
): number {
  return payments
    .filter((payment) => payment.invoice_status !== "void")
    .reduce((sum, payment) => sum + payment[field], 0);
}

function totalOfType(active: readonly StatementInvoiceRow[], type: PaymentType): number {
  return active
    .filter((invoice) => invoice.payment_type === type)
    .reduce((sum, invoice) => sum + invoice.total_usd_cents, 0);
}

export function summarizeStatement(
  customer: Customer,
  invoices: readonly StatementInvoiceRow[],
  payments: readonly StatementPaymentRow[],
  pending: readonly PendingInvoiceRow[],
): StatementSummary {
  const active = invoices.filter((invoice) => invoice.status !== "void");
  return {
    balance_usd_cents: customer.balance_usd_cents,
    credit_sales_usd_cents: totalOfType(active, "credit"),
    cash_sales_usd_cents: totalOfType(active, "cash"),
    payments_usd_cents: sumActivePayments(payments, "amount_usd_cents"),
    payments_bs_cents: sumActivePayments(payments, "amount_bs_cents"),
    invoices: active.length,
    pending_invoices: pending.length,
    oldest_pending_at: pending[0]?.created_at ?? null,
  };
}
