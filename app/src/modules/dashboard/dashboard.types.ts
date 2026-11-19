import type { DocType } from "../customers/customers.types";
import type { ExchangeRateOverview } from "../exchange-rates/exchange-rates.service";
import type { InvoiceSummary } from "../invoices/invoices.service";

/** Ventas no anuladas de un periodo con sus montos fijados al vender (snapshot). */
export interface SalesTotals {
  invoices: number;
  total_usd_cents: number;
  total_bs_cents: number;
}

/** Ventas no anuladas de un día local (`AAAA-MM-DD`). */
export interface DailySalesRow extends SalesTotals {
  date: string;
}

/** Saldo pendiente de todas las facturas fiadas. */
export interface ReceivablesRow {
  total_usd_cents: number;
  debtors: number;
  pending_invoices: number;
}

/** Cliente con saldo pendiente, su número de facturas pendientes y la fecha de la más antigua. */
export interface DebtorRow {
  id: number;
  first_name: string;
  last_name: string;
  doc_type: DocType;
  doc_number: string;
  balance_usd_cents: number;
  pending_invoices: number;
  oldest_pending_at: string;
}

/** Productos activos con stock bajo (menor o igual al umbral) y, entre ellos, los agotados. */
export interface StockAlertsRow {
  low_stock: number;
  out_of_stock: number;
}

/** Cantidad de registros de cada entidad, para saber si es la primera ejecución. */
export interface RecordCountsRow {
  products: number;
  customers: number;
  invoices: number;
}

/** Lo que falta por hacer en la primera ejecución. */
export interface DashboardSetup extends RecordCountsRow {
  business_configured: boolean;
  has_rate: boolean;
}

/** Total por cobrar: deuda en USD y su equivalente en Bs a la tasa vigente (`null` si no hay tasa). */
export interface DashboardReceivables {
  total_usd_cents: number;
  total_bs_cents: number | null;
  debtors: number;
  pending_invoices: number;
}

/** Cliente con deuda pendiente: saldo en USD y su equivalente en Bs a la tasa vigente (`null` si no hay tasa). */
export interface DashboardDebtor {
  id: number;
  name: string;
  document: string;
  balance_usd_cents: number;
  balance_bs_cents: number | null;
  pending_invoices: number;
  oldest_pending_at: string;
}

/** Productos activos con stock bajo según el umbral configurado. */
export interface DashboardStock {
  threshold: number;
  low_stock: number;
  out_of_stock: number;
}

/**
 * Resumen del panel de inicio. "Hoy" y "mes" son del calendario de Caracas. Las ventas suman los montos fijados al
 * vender (USD y Bs del snapshot), sin las anuladas; las deudas se expresan en USD con su equivalente Bs actual.
 */
export interface Dashboard {
  generated_at: string;
  today: string;
  month_start: string;
  exchange_rate: ExchangeRateOverview;
  setup: DashboardSetup;
  sales_today: SalesTotals;
  sales_month: SalesTotals;
  sales_recent_days: DailySalesRow[];
  receivables: DashboardReceivables;
  stock: DashboardStock;
  recent_invoices: InvoiceSummary[];
  top_debtors: DashboardDebtor[];
}
