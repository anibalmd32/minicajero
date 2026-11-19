import type { Customer } from "./customers";
import type { Invoice, InvoicePayment, InvoiceStatus, PaymentType } from "./invoices";

/** Moneda en que se recibe un abono. */
export type PaymentCurrency = "USD" | "VES";

/** Abono a registrar. `amount` va tal cual lo interpretó el formulario para que el servidor explique los errores. */
export interface PaymentInput {
  amount: number | string | null;
  currency: PaymentCurrency;
  notes: string | null;
  expected_rate: number | null;
}

/** Resultado de abonar a una factura. */
export interface InvoicePaymentResult {
  payment: InvoicePayment;
  invoice: Invoice;
}

/** Abono creado por un abono global, con la factura a la que se aplicó. */
export interface AppliedPayment extends InvoicePayment {
  invoice_id: number;
  invoice_number: number;
  invoice_settled: boolean;
}

/** Resultado de un abono global repartido entre las facturas más antiguas primero. */
export interface CustomerPaymentResult {
  customer: Customer;
  amount_usd_cents: number;
  amount_bs_cents: number;
  currency: PaymentCurrency;
  rate: number;
  payments: AppliedPayment[];
}

/** Movimiento del estado de cuenta (factura o abono) con el saldo acumulado. */
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

/** Factura pendiente con lo abonado y su saldo. */
export interface PendingInvoice {
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

/** Estado de cuenta del cliente. */
export interface CustomerStatement {
  customer: Customer;
  summary: {
    balance_usd_cents: number;
    credit_sales_usd_cents: number;
    cash_sales_usd_cents: number;
    payments_usd_cents: number;
    payments_bs_cents: number;
    invoices: number;
    pending_invoices: number;
    oldest_pending_at: string | null;
  };
  pending_invoices: PendingInvoice[];
  entries: StatementEntry[];
  generated_at: string;
}

/** Conversión prevista de un abono con la tasa vigente y cómo deja el saldo. */
export interface PaymentPreview {
  usd_cents: number;
  bs_cents: number;
  remaining_usd_cents: number;
  exceeds: boolean;
  settles: boolean;
}
