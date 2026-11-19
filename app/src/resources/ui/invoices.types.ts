import type { Customer } from "./customers";
import type { ListPage } from "./list";

/** Condición de pago: `cash` contado, `credit` fiado. */
export type PaymentType = "cash" | "credit";

/** Estado de una factura: `paid` pagada, `pending` fiada con saldo, `void` anulada. */
export type InvoiceStatus = "paid" | "pending" | "void";

/** Etiquetas de la condición de pago para la UI. */
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = { cash: "Contado", credit: "Fiado" };

/** Etiquetas del estado de la factura para la UI. */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Pagada",
  pending: "Pendiente",
  void: "Anulada",
};

/** Clases del badge de cada estado. */
export const INVOICE_STATUS_BADGES: Record<InvoiceStatus, string> = {
  paid: "text-bg-success",
  pending: "text-bg-warning",
  void: "text-bg-secondary",
};

/** Línea de factura con el snapshot del producto vendido. */
export interface InvoiceItem {
  id: number;
  product_id: number;
  product_code: string | null;
  product_name: string;
  quantity: number;
  unit_price_usd_cents: number;
  unit_price_bs_cents: number;
  line_total_usd_cents: number;
  line_total_bs_cents: number;
}

/** Abono registrado a una factura fiada, con los Bs tal como se recibieron y la tasa usada. */
export interface InvoicePayment {
  id: number;
  amount_usd_cents: number;
  amount_bs_cents: number;
  currency: "USD" | "VES";
  rate: number;
  notes: string | null;
  created_at: string;
}

/** Montos y datos de cabecera fijados al vender (nunca se recalculan), con la suma de abonos y el saldo. */
export interface InvoiceHeader {
  id: number;
  number: number;
  customer_id: number | null;
  status: InvoiceStatus;
  payment_type: PaymentType;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  rate: number;
  tax_percent: number;
  subtotal_usd_cents: number;
  tax_usd_cents: number;
  total_usd_cents: number;
  subtotal_bs_cents: number;
  tax_bs_cents: number;
  total_bs_cents: number;
  payments_usd_cents: number;
  payments_bs_cents: number;
  balance_usd_cents: number;
  items_count: number;
}

/** Factura del listado con su cliente resumido (o `null` si es consumidor final). */
export interface InvoiceSummary extends InvoiceHeader {
  customer: { id: number; name: string; document: string } | null;
}

/** Factura completa: cliente (o `null` si es consumidor final), líneas y abonos. */
export interface Invoice extends InvoiceHeader {
  customer: Customer | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

/** Resultado de anular: la factura anulada y lo abonado que habría que reintegrar (con un aviso si hay). */
export interface VoidedInvoice extends Invoice {
  refund_usd_cents: number;
  refund_bs_cents: number;
  warning: string | null;
}

/** Totales de todas las facturas del filtro (los montos excluyen las anuladas). */
export interface InvoiceTotals {
  invoices: number;
  voided: number;
  total_usd_cents: number;
  total_bs_cents: number;
  collected_usd_cents: number;
  balance_usd_cents: number;
}

/** Página del listado de facturas con los totales del filtro completo. */
export interface InvoicePage extends ListPage<InvoiceSummary> {
  totals: InvoiceTotals;
}

/** Criterios del listado. Las fechas son días `AAAA-MM-DD` (ambos incluidos). */
export interface InvoiceSearch {
  q: string;
  status: InvoiceStatus | null;
  customerId: number | null;
  from: string;
  to: string;
  limit: number;
  offset: number;
}

/** Venta a registrar, con el precio de cada línea, la tasa y el IVA que vio el operador (el servidor responde 409 si cambiaron). */
export interface SaleInput {
  payment_type: PaymentType;
  customer_id: number | null;
  items: { product_id: number; quantity: number; unit_price_usd_cents: number }[];
  expected_rate: number | null;
  expected_tax_percent: number;
}
