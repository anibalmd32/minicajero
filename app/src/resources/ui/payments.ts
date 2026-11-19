import { api } from "./api";
import type { Invoice } from "./invoices";
import type {
  CustomerPaymentResult,
  CustomerStatement,
  InvoicePaymentResult,
  PaymentCurrency,
  PaymentInput,
} from "./payments.types";

export { previewPayment, SETTLE_TOLERANCE_CENTS, settleAmountCents } from "./payment-preview";
export type {
  AppliedPayment,
  CustomerPaymentResult,
  CustomerStatement,
  InvoicePaymentResult,
  PaymentCurrency,
  PaymentInput,
  PaymentPreview,
  PendingInvoice,
  StatementEntry,
} from "./payments.types";

/** Registra un abono a una factura fiada pendiente. */
export function payInvoice(invoiceId: number, input: PaymentInput): Promise<InvoicePaymentResult> {
  return api.post<InvoicePaymentResult>(`/invoices/${invoiceId}/payments`, input);
}

/** Revierte un abono registrado por error; devuelve la factura actualizada. */
export function revertPayment(paymentId: number): Promise<Invoice> {
  return api.delete<Invoice>(`/payments/${paymentId}`);
}

/** Registra un abono global del cliente (se reparte a las facturas más antiguas primero). */
export function payCustomer(customerId: number, input: PaymentInput): Promise<CustomerPaymentResult> {
  return api.post<CustomerPaymentResult>(`/customers/${customerId}/payments`, input);
}

/** Estado de cuenta del cliente. */
export function fetchStatement(customerId: number): Promise<CustomerStatement> {
  return api.get<CustomerStatement>(`/customers/${customerId}/statement`);
}

/** Dirección del estado de cuenta del cliente. */
export function customerStatementUrl(customerId: number): string {
  return `/clientes/${customerId}`;
}

/** Dirección de la versión imprimible del estado de cuenta; con `autoPrint` abre el diálogo al cargar. */
export function customerStatementPrintUrl(customerId: number, autoPrint = false): string {
  return `/clientes/${customerId}/imprimir${autoPrint ? "?auto=1" : ""}`;
}

/** Etiqueta de la moneda de un abono. */
export function paymentCurrencyLabel(currency: PaymentCurrency): string {
  return currency === "USD" ? "dólares" : "bolívares";
}
