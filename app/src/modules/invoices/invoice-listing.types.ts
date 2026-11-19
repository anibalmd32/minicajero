import type { Pagination } from "../../lib/request";
import type { Customer, DocType } from "../customers/customers.types";
import type { InvoiceItemRow, InvoiceRow, InvoiceStatus, PaymentRow, PaymentType } from "./invoices.types";

/**
 * Término de búsqueda ya interpretado: número de factura o de documento (`#12`, `12345678`),
 * documento con tipo (`V-123`, coincide por prefijo) o texto en nombre y apellidos del cliente (ya normalizado con `searchKey`).
 */
export type InvoiceSearchTerm =
  | { kind: "number"; digits: string }
  | { kind: "document"; docType: DocType; digits: string }
  | { kind: "text"; text: string };

/** Criterios del listado de facturas. Las fechas son instantes UTC ISO: `[createdFrom, createdTo)`. */
export interface InvoiceFilter {
  terms: InvoiceSearchTerm[];
  status: InvoiceStatus | null;
  paymentType: PaymentType | null;
  customerId: number | null;
  createdFrom: string | null;
  createdTo: string | null;
}

/**
 * Totales agregados de las facturas que cumplen un filtro. Los montos excluyen las anuladas.
 * `payments_usd_cents` suma solo los abonos de las fiadas; `collected_usd_cents` es lo cobrado en total:
 * el total de las de contado más los abonos de las fiadas. `balance_usd_cents` es el saldo de las pendientes.
 */
export interface InvoiceTotals {
  invoices: number;
  voided: number;
  subtotal_usd_cents: number;
  tax_usd_cents: number;
  total_usd_cents: number;
  subtotal_bs_cents: number;
  tax_bs_cents: number;
  total_bs_cents: number;
  payments_usd_cents: number;
  collected_usd_cents: number;
  balance_usd_cents: number;
}

/** Cliente resumido de una factura del listado. */
export interface InvoiceCustomerSummary {
  id: number;
  name: string;
  document: string;
}

/** Factura tal como la expone el listado: datos del snapshot, la suma de abonos, el saldo y el cliente (o `null` si es consumidor final). */
export interface InvoiceSummary
  extends Omit<InvoiceRow, "customer_first_name" | "customer_last_name" | "customer_doc_type" | "customer_doc_number"> {
  customer: InvoiceCustomerSummary | null;
}

/** Factura con sus líneas, abonos y el cliente completo (con su saldo global). */
export interface InvoiceDetail extends Omit<InvoiceSummary, "customer"> {
  customer: Customer | null;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
}

/** Resultado de anular una factura: la factura anulada y, si tenía abonos, el monto a reintegrar en ambas monedas y un aviso. */
export interface VoidedInvoice extends InvoiceDetail {
  refund_usd_cents: number;
  refund_bs_cents: number;
  warning: string | null;
}

/** Página del listado de facturas con los totales agregados de todo el filtro (no solo de la página). */
export interface InvoicePage extends Pagination {
  items: InvoiceSummary[];
  total: number;
  totals: InvoiceTotals;
}

/** Criterios de búsqueda tal como llegan en la query string. */
export interface InvoiceQuery {
  q: string | null;
  status: string | null;
  payment_type: string | null;
  customer_id: string | null;
  from: string | null;
  to: string | null;
}
