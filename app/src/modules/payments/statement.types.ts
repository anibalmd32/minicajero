import type { Customer } from "../customers/customers.types";
import type { InvoiceStatus, PaymentRow, PaymentType } from "../invoices/invoices.types";
import type { PaymentCurrency } from "./payments.types";

/** Factura pendiente de un cliente con lo abonado y su saldo, para repartir abonos globales. */
export interface PendingInvoiceRow {
  id: number;
  number: number;
  created_at: string;
  total_usd_cents: number;
  total_bs_cents: number;
  rate: number;
  payments_usd_cents: number;
  payments_bs_cents: number;
  balance_usd_cents: number;
}

/** Factura del cliente tal como aparece en su estado de cuenta. */
export interface StatementInvoiceRow {
  id: number;
  number: number;
  status: InvoiceStatus;
  payment_type: PaymentType;
  rate: number;
  total_usd_cents: number;
  total_bs_cents: number;
  created_at: string;
  voided_at: string | null;
}

/** Abono del cliente con los datos de su factura, para el estado de cuenta. */
export interface StatementPaymentRow extends PaymentRow {
  invoice_number: number;
  invoice_status: InvoiceStatus;
}

/**
 * Movimiento del estado de cuenta. Una factura es un cargo (las de contado también llevan su pago en `credit_*`);
 * un abono es un crédito. `counts` es `false` en lo anulado (factura anulada y sus abonos), que no mueve el saldo.
 * `balance_usd_cents` es el saldo acumulado tras el movimiento.
 */
export interface StatementEntry {
  kind: "invoice" | "payment";
  date: string;
  invoice_id: number;
  invoice_number: number;
  invoice_status: InvoiceStatus;
  payment_type: PaymentType | null;
  payment_id: number | null;
  currency: PaymentCurrency | null;
  rate: number;
  notes: string | null;
  charge_usd_cents: number;
  charge_bs_cents: number;
  credit_usd_cents: number;
  credit_bs_cents: number;
  balance_usd_cents: number;
  counts: boolean;
}

/** Totales del estado de cuenta (sin lo anulado). */
export interface StatementSummary {
  balance_usd_cents: number;
  credit_sales_usd_cents: number;
  cash_sales_usd_cents: number;
  payments_usd_cents: number;
  payments_bs_cents: number;
  invoices: number;
  pending_invoices: number;
  oldest_pending_at: string | null;
}

/** Estado de cuenta del cliente: resumen, facturas pendientes (más antigua primero) y movimientos cronológicos. */
export interface CustomerStatement {
  customer: Customer;
  summary: StatementSummary;
  pending_invoices: PendingInvoiceRow[];
  entries: StatementEntry[];
  generated_at: string;
}
