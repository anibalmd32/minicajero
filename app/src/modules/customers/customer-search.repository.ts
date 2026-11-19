import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { escapeLike, searchKey } from "../../lib/text";
import type { CustomerFilter, CustomerRow, SearchTerm } from "./customers.types";

type Params = Record<string, string | number | null>;

const BALANCES_CTE = `
WITH paid AS (
  SELECT invoice_id, SUM(amount_usd_cents) AS paid_usd_cents
  FROM payments
  GROUP BY invoice_id
),
balances AS (
  SELECT i.customer_id, SUM(MAX(i.total_usd_cents - COALESCE(p.paid_usd_cents, 0), 0)) AS balance_usd_cents
  FROM invoices i
  LEFT JOIN paid p ON p.invoice_id = i.id
  WHERE i.status = 'pending' AND i.customer_id IS NOT NULL
  GROUP BY i.customer_id
)`;

const SELECT_WITH_BALANCE = `${BALANCES_CTE}
SELECT c.id, c.first_name, c.last_name, c.doc_type, c.doc_number, c.phone,
       COALESCE(b.balance_usd_cents, 0) AS balance_usd_cents, c.created_at, c.updated_at
FROM customers c
LEFT JOIN balances b ON b.customer_id = c.id`;

const COUNT_WITH_BALANCE = `${BALANCES_CTE}
SELECT COUNT(*) AS total
FROM customers c
LEFT JOIN balances b ON b.customer_id = c.id`;

const ORDER_BY = "ORDER BY c.first_name_key, c.last_name_key, c.id";

function documentCondition(term: Extract<SearchTerm, { kind: "document" }>, index: number, params: Params): string {
  params[`doc_type_${index}`] = term.docType;
  params[`doc_prefix_${index}`] = `${escapeLike(term.digits)}%`;
  return `(c.doc_type = $doc_type_${index} AND ltrim(c.doc_number, '0') LIKE $doc_prefix_${index} ESCAPE '\\')`;
}

function textCondition(term: Extract<SearchTerm, { kind: "text" }>, index: number, params: Params): string {
  params[`text_${index}`] = `%${escapeLike(searchKey(term.text))}%`;
  const alternatives = [`c.search_text LIKE $text_${index} ESCAPE '\\'`];
  if (term.docDigits) {
    params[`doc_digits_${index}`] = `%${escapeLike(term.docDigits)}%`;
    alternatives.push(`c.doc_number LIKE $doc_digits_${index} ESCAPE '\\'`);
  }
  if (term.phoneDigits) {
    params[`phone_digits_${index}`] = `%${escapeLike(term.phoneDigits)}%`;
    alternatives.push(`c.phone LIKE $phone_digits_${index} ESCAPE '\\'`);
  }
  return `(${alternatives.join(" OR ")})`;
}

function buildWhere(filter: CustomerFilter): { where: string; params: Params } {
  const params: Params = {};
  const conditions = filter.terms.map((term, index) =>
    term.kind === "document" ? documentCondition(term, index, params) : textCondition(term, index, params),
  );
  if (filter.debtorsOnly) conditions.push("COALESCE(b.balance_usd_cents, 0) > 0");
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

/** Página de clientes que cumplen el filtro, ordenados por nombre. */
export function listCustomers(
  filter: CustomerFilter,
  limit: number,
  offset: number,
  db: Database = getDb(),
): CustomerRow[] {
  const { where, params } = buildWhere(filter);
  return db
    .query<CustomerRow, Params>(`${SELECT_WITH_BALANCE} ${where} ${ORDER_BY} LIMIT $limit OFFSET $offset`)
    .all({ ...params, limit, offset });
}

/** Total de clientes que cumplen el filtro. */
export function countCustomers(filter: CustomerFilter, db: Database = getDb()): number {
  const { where, params } = buildWhere(filter);
  return db.query<{ total: number }, Params>(`${COUNT_WITH_BALANCE} ${where}`).get(params)?.total ?? 0;
}

/** Cliente por id con su saldo, o `null` si no existe. */
export function findCustomerById(id: number, db: Database = getDb()): CustomerRow | null {
  return db.query<CustomerRow, { id: number }>(`${SELECT_WITH_BALANCE} WHERE c.id = $id`).get({ id });
}
