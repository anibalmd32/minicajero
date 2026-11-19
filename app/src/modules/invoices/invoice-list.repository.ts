import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { InvoiceFilter, InvoiceTotals } from "./invoice-listing.types";
import { BALANCE_USD, COLLECTED_USD, FROM_INVOICES, PAYMENTS_USD, SELECT_INVOICE, type SqlParams } from "./invoice-sql";
import { buildWhere } from "./invoice-where";
import type { InvoiceRow } from "./invoices.types";

/** Página de facturas que cumplen el filtro, de la más reciente (número mayor) a la más antigua. */
export function listInvoices(
  filter: InvoiceFilter,
  limit: number,
  offset: number,
  db: Database = getDb(),
): InvoiceRow[] {
  const { where, params } = buildWhere(filter);
  return db
    .query<InvoiceRow, SqlParams>(`${SELECT_INVOICE} ${where} ORDER BY i.number DESC LIMIT $limit OFFSET $offset`)
    .all({ ...params, limit, offset });
}

/** Cantidad de facturas (de cualquier estado) que cumplen el filtro. */
export function countInvoices(filter: InvoiceFilter, db: Database = getDb()): number {
  const { where, params } = buildWhere(filter);
  return (
    db.query<{ total: number }, SqlParams>(`SELECT COUNT(*) AS total ${FROM_INVOICES} ${where}`).get(params)?.total ?? 0
  );
}

/** Totales de las facturas que cumplen el filtro: montos, abonos y lo cobrado de las no anuladas y saldo de las pendientes. */
export function sumInvoices(filter: InvoiceFilter, db: Database = getDb()): InvoiceTotals {
  const { where, params } = buildWhere(filter);
  const active = (column: string) => `COALESCE(SUM(CASE WHEN i.status <> 'void' THEN ${column} END), 0)`;
  const row = db
    .query<InvoiceTotals, SqlParams>(
      `SELECT COALESCE(SUM(i.status <> 'void'), 0) AS invoices,
              COALESCE(SUM(i.status = 'void'), 0) AS voided,
              ${active("i.subtotal_usd_cents")} AS subtotal_usd_cents,
              ${active("i.tax_usd_cents")} AS tax_usd_cents,
              ${active("i.total_usd_cents")} AS total_usd_cents,
              ${active("i.subtotal_bs_cents")} AS subtotal_bs_cents,
              ${active("i.tax_bs_cents")} AS tax_bs_cents,
              ${active("i.total_bs_cents")} AS total_bs_cents,
              ${active(PAYMENTS_USD)} AS payments_usd_cents,
              ${active(COLLECTED_USD)} AS collected_usd_cents,
              COALESCE(SUM(${BALANCE_USD}), 0) AS balance_usd_cents
       ${FROM_INVOICES} ${where}`,
    )
    .get(params);
  if (!row) throw new Error("No se pudieron calcular los totales de facturas");
  return row;
}
