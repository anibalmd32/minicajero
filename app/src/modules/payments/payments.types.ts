import type { Customer } from "../customers/customers.types";
import type { InvoiceDetail } from "../invoices/invoice-listing.types";
import type { PaymentRow } from "../invoices/invoices.types";

/** Moneda en que se recibió un abono. */
export const PAYMENT_CURRENCIES = ["USD", "VES"] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

/** Datos de un abono nuevo: montos en ambas monedas y la tasa usada para convertir. */
export interface NewPayment {
  invoice_id: number;
  amount_usd_cents: number;
  amount_bs_cents: number;
  currency: PaymentCurrency;
  rate: number;
  notes: string | null;
}

/** Abono ya validado: monto en centavos/céntimos de la moneda en que se recibe. */
export interface PaymentRequest {
  amount_cents: number;
  currency: PaymentCurrency;
  notes: string | null;
  expected_rate: number | null;
}

/** Montos de un abono en ambas monedas. */
export interface PaymentAmounts {
  amount_usd_cents: number;
  amount_bs_cents: number;
}

/** Parte de un abono aplicada a una factura. */
export interface PaymentAllocation extends PaymentAmounts {
  invoice_id: number;
}

/** Resultado de abonar a una factura: el abono creado y la factura actualizada. */
export interface InvoicePaymentResult {
  payment: PaymentRow;
  invoice: InvoiceDetail;
}

/** Abono creado por un abono global, con el número de la factura a la que se aplicó y si quedó saldada. */
export interface AppliedPayment extends PaymentRow {
  invoice_number: number;
  invoice_settled: boolean;
}

/** Resultado de un abono global: el cliente con su nuevo saldo y los abonos creados (uno por factura, FIFO). */
export interface CustomerPaymentResult extends PaymentAmounts {
  customer: Customer;
  currency: PaymentCurrency;
  rate: number;
  payments: AppliedPayment[];
}
