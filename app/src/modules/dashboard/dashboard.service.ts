import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { BUSINESS_UTC_OFFSET_HOURS, localDayEndUtc, localDayStartUtc, toLocalDate } from "../../lib/dates";
import { usdToBs } from "../../lib/money";
import { formatDocument } from "../customers/customer-document";
import { getRateOverview } from "../exchange-rates/exchange-rates.service";
import { listRecentInvoices } from "../invoices/invoices.service";
import { getSettings } from "../settings/settings.service";
import {
  countRecords,
  countStockAlerts,
  listDailySales,
  listTopDebtors,
  sumReceivables,
  sumSales,
} from "./dashboard.repository";
import { fillDailySales, recentLocalDates } from "./dashboard.series";
import type { Dashboard, DashboardDebtor, DebtorRow } from "./dashboard.types";

export { fillDailySales, recentLocalDates } from "./dashboard.series";
export type {
  Dashboard,
  DashboardDebtor,
  DashboardReceivables,
  DashboardSetup,
  DashboardStock,
} from "./dashboard.types";

/** Días que abarca la gráfica de ventas recientes (incluido hoy). */
export const RECENT_SALES_DAYS = 7;

/** Facturas recientes que muestra el panel. */
export const RECENT_INVOICES_LIMIT = 8;

/** Deudores que muestra el panel. */
export const TOP_DEBTORS_LIMIT = 5;

function toBsOrNull(usdCents: number, rate: number | null): number | null {
  return rate === null ? null : usdToBs(usdCents, rate);
}

function toDebtor(row: DebtorRow, rate: number | null): DashboardDebtor {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    document: formatDocument(row.doc_type, row.doc_number),
    balance_usd_cents: row.balance_usd_cents,
    balance_bs_cents: toBsOrNull(row.balance_usd_cents, rate),
    pending_invoices: row.pending_invoices,
    oldest_pending_at: row.oldest_pending_at,
  };
}

function readSales(
  db: Database,
  today: string,
  monthStart: string,
): Pick<Dashboard, "sales_today" | "sales_month" | "sales_recent_days"> {
  const recentDates = recentLocalDates(today, RECENT_SALES_DAYS);
  const tomorrowUtc = localDayEndUtc(today);
  const recentFromUtc = localDayStartUtc(recentDates[0] ?? today);
  return {
    sales_today: sumSales(localDayStartUtc(today), tomorrowUtc, db),
    sales_month: sumSales(localDayStartUtc(monthStart), tomorrowUtc, db),
    sales_recent_days: fillDailySales(
      recentDates,
      listDailySales(recentFromUtc, tomorrowUtc, BUSINESS_UTC_OFFSET_HOURS, db),
    ),
  };
}

function readDashboard(db: Database, now: number): Dashboard {
  const today = toLocalDate(now);
  const monthStart = `${today.slice(0, 8)}01`;
  const exchangeRate = getRateOverview(db, now);
  const rate = exchangeRate.rate;
  const settings = getSettings(db);
  const receivables = sumReceivables(db);
  return {
    generated_at: new Date(now).toISOString(),
    today,
    month_start: monthStart,
    exchange_rate: exchangeRate,
    setup: { ...countRecords(db), business_configured: settings.business_name.trim() !== "", has_rate: rate !== null },
    ...readSales(db, today, monthStart),
    receivables: { ...receivables, total_bs_cents: toBsOrNull(receivables.total_usd_cents, rate) },
    stock: { threshold: settings.low_stock_threshold, ...countStockAlerts(settings.low_stock_threshold, db) },
    recent_invoices: listRecentInvoices(RECENT_INVOICES_LIMIT, db),
    top_debtors: listTopDebtors(TOP_DEBTORS_LIMIT, db).map((row) => toDebtor(row, rate)),
  };
}

/** Resumen del panel de inicio en una sola lectura consistente de la BD. */
export function getDashboard(db: Database = getDb(), now: number = Date.now()): Dashboard {
  return db.transaction(() => readDashboard(db, now))();
}
