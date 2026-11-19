import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { PAYMENT_COLUMNS } from "./payments.repository";
import type { PendingInvoiceRow, StatementInvoiceRow, StatementPaymentRow } from "./statement.types";

/** Facturas pendientes del cliente con su saldo, de la más antigua a la más reciente. */
export function listPendingInvoices(customerId: number, db: Database = getDb()): PendingInvoiceRow[] {
  return db
    .query<PendingInvoiceRow, { customer_id: number }>(
      `SELECT i.id, i.number, i.created_at, i.total_usd_cents, i.total_bs_cents, i.rate,
              COALESCE(SUM(p.amount_usd_cents), 0) AS payments_usd_cents,
              COALESCE(SUM(p.amount_bs_cents), 0) AS payments_bs_cents,
              MAX(i.total_usd_cents - COALESCE(SUM(p.amount_usd_cents), 0), 0) AS balance_usd_cents
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.customer_id = $customer_id AND i.status = 'pending'
       GROUP BY i.id
       ORDER BY i.created_at, i.id`,
    )
    .all({ customer_id: customerId });
}

/** Todas las facturas del cliente (de cualquier estado), de la más antigua a la más reciente. */
export function listStatementInvoices(customerId: number, db: Database = getDb()): StatementInvoiceRow[] {
  return db
    .query<StatementInvoiceRow, { customer_id: number }>(
      `SELECT id, number, status, payment_type, rate, total_usd_cents, total_bs_cents, created_at, voided_at
       FROM invoices
       WHERE customer_id = $customer_id
       ORDER BY created_at, id`,
    )
    .all({ customer_id: customerId });
}

/** Todos los abonos a facturas del cliente, del más antiguo al más reciente. */
export function listStatementPayments(customerId: number, db: Database = getDb()): StatementPaymentRow[] {
  return db
    .query<StatementPaymentRow, { customer_id: number }>(
      `SELECT ${PAYMENT_COLUMNS}, i.number AS invoice_number, i.status AS invoice_status
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE i.customer_id = $customer_id
       ORDER BY p.created_at, p.id`,
    )
    .all({ customer_id: customerId });
}
