import type { InvoiceAmounts, InvoiceItemData, PaymentType } from "./invoices.types";

/** Línea pedida (ya agrupada por producto), con el precio unitario que vio el operador si lo envió. */
export interface SaleLine {
  product_id: number;
  quantity: number;
  expected_price_usd_cents?: number;
}

/** Venta ya validada, antes de consultar productos, stock y tasa. `expected_*` son los valores que vio el operador (opcionales). */
export interface SaleRequest {
  customer_id: number | null;
  payment_type: PaymentType;
  lines: SaleLine[];
  notes: string | null;
  expected_rate: number | null;
  expected_tax_percent: number | null;
}

/** Producto con la cantidad vendida, insumo del cálculo del snapshot. */
export interface PricedLine {
  product_id: number;
  product_name: string;
  unit_price_usd_cents: number;
  quantity: number;
}

/** Montos calculados de una venta: líneas y totales en USD y Bs con la tasa y el IVA aplicados. */
export interface SaleSnapshot extends InvoiceAmounts {
  items: InvoiceItemData[];
}
