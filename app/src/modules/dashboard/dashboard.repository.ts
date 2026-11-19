import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type {
  DailySalesRow,
  DebtorRow,
  ReceivablesRow,
  RecordCountsRow,
  SalesTotals,
  StockAlertsRow,
} from "./dashboard.types";

export type {
  DailySalesRow,
  DebtorRow,
  ReceivablesRow,
  RecordCountsRow,
  SalesTotals,
  StockAlertsRow,
} from "./dashboard.types";

const PENDING_BALANCES = `
WITH paid AS (
  SELECT invoice_id, SUM(amount_usd_cents) AS paid_usd_cents
  FROM payments
  GROUP BY invoice_id
),
pending AS (
  SELECT i.id, i.customer_id, i.created_at,
         MAX(i.total_usd_cents - COALESCE(p.paid_usd_cents, 0), 0) AS balance_usd_cents
  FROM invoices i
  LEFT JOIN paid p ON p.invoice_id = i.id
  WHERE i.status = 'pending' AND i.customer_id IS NOT NULL
)`;

/** Ventas no anuladas creadas en `[fromUtc, toUtc)`. */
export function sumSales(fromUtc: string, toUtc: string, db: Database = getDb()): SalesTotals {
  const row = db
    .query<SalesTotals, { from: string; to: string }>(
      `SELECT COUNT(*) AS invoices,
              COALESCE(SUM(total_usd_cents), 0) AS total_usd_cents,
              COALESCE(SUM(total_bs_cents), 0) AS total_bs_cents
       FROM invoices
       WHERE status <> 'void' AND created_at >= $from AND created_at < $to`,
    )
    .get({ from: fromUtc, to: toUtc });
  return row ?? { invoices: 0, total_usd_cents: 0, total_bs_cents: 0 };
}

/**
 * Ventas no anuladas de `[fromUtc, toUtc)` agrupadas por día local. `utcOffsetHours` es el desfase de la hora local
 * respecto a UTC (-4 en Caracas). Solo devuelve los días con ventas.
 */
export function listDailySales(
  fromUtc: string,
  toUtc: string,
  utcOffsetHours: number,
  db: Database = getDb(),
): DailySalesRow[] {
  return db
    .query<DailySalesRow, { from: string; to: string; offset: string }>(
      `SELECT date(created_at, $offset) AS date,
              COUNT(*) AS invoices,
              SUM(total_usd_cents) AS total_usd_cents,
              SUM(total_bs_cents) AS total_bs_cents
       FROM invoices
       WHERE status <> 'void' AND created_at >= $from AND created_at < $to
       GROUP BY 1
       ORDER BY 1`,
    )
    .all({ from: fromUtc, to: toUtc, offset: `${utcOffsetHours} hours` });
}

/** Total por cobrar de las facturas fiadas pendientes, con cuántos clientes y facturas lo componen. */
export function sumReceivables(db: Database = getDb()): ReceivablesRow {
  const row = db
    .query<ReceivablesRow, []>(
      `${PENDING_BALANCES}
       SELECT COALESCE(SUM(balance_usd_cents), 0) AS total_usd_cents,
              COUNT(DISTINCT CASE WHEN balance_usd_cents > 0 THEN customer_id END) AS debtors,
              COALESCE(SUM(balance_usd_cents > 0), 0) AS pending_invoices
       FROM pending`,
    )
    .get();
  return row ?? { total_usd_cents: 0, debtors: 0, pending_invoices: 0 };
}

/** Los `limit` clientes con mayor saldo pendiente (a igual saldo, el de deuda más antigua primero). */
export function listTopDebtors(limit: number, db: Database = getDb()): DebtorRow[] {
  return db
    .query<DebtorRow, { limit: number }>(
      `${PENDING_BALANCES},
       debts AS (
         SELECT customer_id, SUM(balance_usd_cents) AS balance_usd_cents, COUNT(*) AS pending_invoices,
                MIN(created_at) AS oldest_pending_at
         FROM pending
         WHERE balance_usd_cents > 0
         GROUP BY customer_id
       )
       SELECT c.id, c.first_name, c.last_name, c.doc_type, c.doc_number,
              d.balance_usd_cents, d.pending_invoices, d.oldest_pending_at
       FROM debts d
       JOIN customers c ON c.id = d.customer_id
       ORDER BY d.balance_usd_cents DESC, d.oldest_pending_at, c.id
       LIMIT $limit`,
    )
    .all({ limit });
}

/** Productos activos con stock menor o igual a `threshold` y cuántos de ellos están agotados. */
export function countStockAlerts(threshold: number, db: Database = getDb()): StockAlertsRow {
  const row = db
    .query<StockAlertsRow, { threshold: number }>(
      `SELECT COUNT(*) AS low_stock, COALESCE(SUM(stock = 0), 0) AS out_of_stock
       FROM products
       WHERE active = 1 AND stock <= $threshold`,
    )
    .get({ threshold });
  return row ?? { low_stock: 0, out_of_stock: 0 };
}

/** Cantidad de productos, clientes y facturas registrados. */
export function countRecords(db: Database = getDb()): RecordCountsRow {
  const row = db
    .query<RecordCountsRow, []>(
      `SELECT (SELECT COUNT(*) FROM products) AS products,
              (SELECT COUNT(*) FROM customers) AS customers,
              (SELECT COUNT(*) FROM invoices) AS invoices`,
    )
    .get();
  return row ?? { products: 0, customers: 0, invoices: 0 };
}
