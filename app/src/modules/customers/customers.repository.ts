import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { searchKey, searchText } from "../../lib/text";
import type { CustomerData, DocType } from "./customers.types";

type CustomerRecord = CustomerData & { first_name_key: string; last_name_key: string; search_text: string };

/** Id del cliente con ese documento, o `null` si no existe. */
export function findCustomerIdByDocument(docType: DocType, docNumber: string, db: Database = getDb()): number | null {
  return (
    db
      .query<{ id: number }, { doc_type: DocType; doc_number: string }>(
        "SELECT id FROM customers WHERE doc_type = $doc_type AND doc_number = $doc_number",
      )
      .get({ doc_type: docType, doc_number: docNumber })?.id ?? null
  );
}

function withSearchKeys(data: CustomerData): CustomerRecord {
  return {
    ...data,
    first_name_key: searchKey(data.first_name),
    last_name_key: searchKey(data.last_name),
    search_text: searchText(data.first_name, data.last_name),
  };
}

/** Inserta un cliente y devuelve su id. */
export function insertCustomer(data: CustomerData, db: Database = getDb()): number {
  const row = db
    .query<{ id: number }, CustomerRecord>(
      `INSERT INTO customers (first_name, last_name, first_name_key, last_name_key, search_text, doc_type, doc_number,
         phone)
       VALUES ($first_name, $last_name, $first_name_key, $last_name_key, $search_text, $doc_type, $doc_number, $phone)
       RETURNING id`,
    )
    .get(withSearchKeys(data));
  if (!row) throw new Error("No se pudo registrar el cliente");
  return row.id;
}

/** Actualiza un cliente; devuelve `false` si no existe. Solo toca `updated_at` si algo cambia. */
export function updateCustomer(id: number, data: CustomerData, db: Database = getDb()): boolean {
  const exists = db.query<{ id: number }, { id: number }>("SELECT id FROM customers WHERE id = $id").get({ id });
  if (!exists) return false;
  db.query<unknown, CustomerRecord & { id: number }>(
    `UPDATE customers
     SET first_name = $first_name, last_name = $last_name, first_name_key = $first_name_key,
         last_name_key = $last_name_key, search_text = $search_text, doc_type = $doc_type, doc_number = $doc_number,
         phone = $phone, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = $id
       AND (first_name IS NOT $first_name OR last_name IS NOT $last_name OR doc_type IS NOT $doc_type
            OR doc_number IS NOT $doc_number OR phone IS NOT $phone OR search_text IS NOT $search_text)`,
  ).run({ ...withSearchKeys(data), id });
  return true;
}

/** Elimina un cliente; devuelve `false` si no existía. */
export function deleteCustomer(id: number, db: Database = getDb()): boolean {
  return db.query<unknown, { id: number }>("DELETE FROM customers WHERE id = $id").run({ id }).changes > 0;
}

/** Cantidad de facturas (de cualquier estado) asociadas al cliente. */
export function countCustomerInvoices(id: number, db: Database = getDb()): number {
  return (
    db
      .query<{ total: number }, { id: number }>("SELECT COUNT(*) AS total FROM invoices WHERE customer_id = $id")
      .get({ id })?.total ?? 0
  );
}
