import { api } from "./api";
import {
  INVOICE_STATUS_BADGES,
  INVOICE_STATUS_LABELS,
  type Invoice,
  type InvoicePage,
  type InvoiceSearch,
  type InvoiceStatus,
  type SaleInput,
  type VoidedInvoice,
} from "./invoices.types";

export {
  INVOICE_STATUS_BADGES,
  INVOICE_STATUS_LABELS,
  type Invoice,
  type InvoiceHeader,
  type InvoiceItem,
  type InvoicePage,
  type InvoicePayment,
  type InvoiceSearch,
  type InvoiceStatus,
  type InvoiceSummary,
  type InvoiceTotals,
  PAYMENT_TYPE_LABELS,
  type PaymentType,
  type SaleInput,
  type VoidedInvoice,
} from "./invoices.types";

/** Registra la venta (descuenta stock y fija la tasa y el IVA vigentes). */
export function createInvoice(input: SaleInput): Promise<Invoice> {
  return api.post<Invoice>("/invoices", input);
}

/** Busca facturas con los totales del filtro. */
export function fetchInvoices(search: InvoiceSearch): Promise<InvoicePage> {
  return api.get<InvoicePage>("/invoices", {
    q: search.q,
    status: search.status,
    customer_id: search.customerId,
    from: search.from,
    to: search.to,
    limit: search.limit,
    offset: search.offset,
  });
}

/** Factura con líneas, abonos y saldo. */
export function fetchInvoice(id: number): Promise<Invoice> {
  return api.get<Invoice>(`/invoices/${id}`);
}

/** Anula la factura (devuelve el stock); `reason` vacío se envía como `null`. */
export function voidInvoice(id: number, reason: string): Promise<VoidedInvoice> {
  return api.post<VoidedInvoice>(`/invoices/${id}/void`, { reason: reason === "" ? null : reason });
}

/** Número de factura para mostrar: `#12`. */
export function invoiceNumberLabel(number: number): string {
  return `#${number}`;
}

/** Badge de estado de la factura. */
export function invoiceStatusBadge(status: InvoiceStatus): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `badge ${INVOICE_STATUS_BADGES[status]}`;
  badge.textContent = INVOICE_STATUS_LABELS[status];
  return badge;
}

/** Dirección de la vista imprimible; con `autoPrint` abre el diálogo de impresión al cargar. */
export function invoicePrintUrl(id: number, autoPrint = false): string {
  return `/facturas/${id}/imprimir${autoPrint ? "?auto=1" : ""}`;
}
