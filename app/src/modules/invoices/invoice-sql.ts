export type SqlParams = Record<string, string | number | null>;

export const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function paymentsSum(column: "amount_usd_cents" | "amount_bs_cents"): string {
  return `(SELECT COALESCE(SUM(pay.${column}), 0) FROM payments pay WHERE pay.invoice_id = i.id)`;
}

export const PAYMENTS_USD = paymentsSum("amount_usd_cents");

export const PAYMENTS_BS = paymentsSum("amount_bs_cents");

export const BALANCE_USD = `CASE WHEN i.status = 'pending' THEN MAX(i.total_usd_cents - ${PAYMENTS_USD}, 0) ELSE 0 END`;

export const COLLECTED_USD = `CASE WHEN i.payment_type = 'cash' THEN i.total_usd_cents ELSE ${PAYMENTS_USD} END`;

export const FROM_INVOICES = "FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id";

export const SELECT_INVOICE = `SELECT i.id, i.number, i.customer_id, i.status, i.payment_type, i.rate, i.tax_percent,
       i.subtotal_usd_cents, i.tax_usd_cents, i.total_usd_cents, i.subtotal_bs_cents, i.tax_bs_cents, i.total_bs_cents,
       i.notes, i.created_at, i.voided_at, i.void_reason,
       ${PAYMENTS_USD} AS payments_usd_cents,
       ${PAYMENTS_BS} AS payments_bs_cents,
       ${BALANCE_USD} AS balance_usd_cents,
       (SELECT COUNT(*) FROM invoice_items it WHERE it.invoice_id = i.id) AS items_count,
       c.first_name AS customer_first_name, c.last_name AS customer_last_name,
       c.doc_type AS customer_doc_type, c.doc_number AS customer_doc_number
${FROM_INVOICES}`;
