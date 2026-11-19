import { api } from "./api";
import type { ExchangeRateOverview } from "./exchange-rate";
import type { InvoiceSummary } from "./invoices";

/** Ventas no anuladas de un periodo con los montos fijados al vender. */
export interface SalesTotals {
  invoices: number;
  total_usd_cents: number;
  total_bs_cents: number;
}

/** Ventas de un día local (`AAAA-MM-DD`). */
export interface DailySales extends SalesTotals {
  date: string;
}

/** Cliente con deuda pendiente (saldo en USD; su Bs a la tasa vigente o `null` sin tasa). */
export interface DashboardDebtor {
  id: number;
  name: string;
  document: string;
  balance_usd_cents: number;
  balance_bs_cents: number | null;
  pending_invoices: number;
  oldest_pending_at: string;
}

/** Resumen del panel de inicio (`GET /api/v1/dashboard`). "Hoy" y "mes" son del calendario de Caracas. */
export interface Dashboard {
  generated_at: string;
  today: string;
  month_start: string;
  exchange_rate: ExchangeRateOverview;
  setup: {
    products: number;
    customers: number;
    invoices: number;
    business_configured: boolean;
    has_rate: boolean;
  };
  sales_today: SalesTotals;
  sales_month: SalesTotals;
  sales_recent_days: DailySales[];
  receivables: {
    total_usd_cents: number;
    total_bs_cents: number | null;
    debtors: number;
    pending_invoices: number;
  };
  stock: { threshold: number; low_stock: number; out_of_stock: number };
  recent_invoices: InvoiceSummary[];
  top_debtors: DashboardDebtor[];
}

/** Consulta el resumen del panel de inicio. */
export function fetchDashboard(): Promise<Dashboard> {
  return api.get<Dashboard>("/dashboard");
}
