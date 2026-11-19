import type { DocType } from "../customers/customers.types";

/** Estados de una factura: `paid` pagada, `pending` fiada con saldo, `void` anulada. */
export const INVOICE_STATUSES = ["paid", "pending", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Condiciones de pago: `cash` contado, `credit` fiado. */
export const PAYMENT_TYPES = ["cash", "credit"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Montos fijados al momento de la venta (snapshot): nunca se recalculan. */
export interface InvoiceAmounts {
  rate: number;
  tax_percent: number;
  subtotal_usd_cents: number;
  tax_usd_cents: number;
  total_usd_cents: number;
  subtotal_bs_cents: number;
  tax_bs_cents: number;
  total_bs_cents: number;
}

/**
 * Factura con la suma de sus abonos, su saldo pendiente y los datos básicos del cliente (nulos si es consumidor final).
 * `payments_usd_cents`/`payments_bs_cents` suman solo los abonos registrados (los Bs tal como se recibieron): en una
 * venta de contado valen 0 aunque esté `paid`, porque se cobró completa al vender.
 */
export interface InvoiceRow extends InvoiceAmounts {
  id: number;
  number: number;
  customer_id: number | null;
  status: InvoiceStatus;
  payment_type: PaymentType;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  payments_usd_cents: number;
  payments_bs_cents: number;
  balance_usd_cents: number;
  items_count: number;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_doc_type: DocType | null;
  customer_doc_number: string | null;
}

/** Datos de una factura nueva. */
export interface NewInvoice extends InvoiceAmounts {
  number: number;
  customer_id: number | null;
  status: InvoiceStatus;
  payment_type: PaymentType;
  notes: string | null;
}

/** Línea de factura con el snapshot del producto vendido. */
export interface InvoiceItemData {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price_usd_cents: number;
  unit_price_bs_cents: number;
  line_total_usd_cents: number;
  line_total_bs_cents: number;
}

/** Línea de factura guardada. */
export interface InvoiceItemRow extends InvoiceItemData {
  id: number;
  invoice_id: number;
  product_code: string | null;
}

/** Abono registrado a una factura. */
export interface PaymentRow {
  id: number;
  invoice_id: number;
  amount_usd_cents: number;
  amount_bs_cents: number;
  currency: "USD" | "VES";
  rate: number;
  notes: string | null;
  created_at: string;
}
