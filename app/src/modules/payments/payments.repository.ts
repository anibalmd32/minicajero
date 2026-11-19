import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { PaymentRow } from "../invoices/invoices.types";
import type { NewPayment } from "./payments.types";

export const PAYMENT_COLUMNS =
  "p.id, p.invoice_id, p.amount_usd_cents, p.amount_bs_cents, p.currency, p.rate, p.notes, p.created_at";

/** Inserta un abono y devuelve su id. */
export function insertPayment(payment: NewPayment, db: Database = getDb()): number {
  const row = db
    .query<{ id: number }, Record<string, string | number | null>>(
      `INSERT INTO payments (invoice_id, amount_usd_cents, amount_bs_cents, currency, rate, notes)
       VALUES ($invoice_id, $amount_usd_cents, $amount_bs_cents, $currency, $rate, $notes)
       RETURNING id`,
    )
    .get({ ...payment });
  if (!row) throw new Error("No se pudo registrar el abono");
  return row.id;
}

/** Abono por id, o `null` si no existe. */
export function findPaymentById(id: number, db: Database = getDb()): PaymentRow | null {
  return db.query<PaymentRow, { id: number }>(`SELECT ${PAYMENT_COLUMNS} FROM payments p WHERE p.id = $id`).get({ id });
}

/** Elimina un abono; devuelve `false` si no existía. */
export function deletePaymentRow(id: number, db: Database = getDb()): boolean {
  return db.query<unknown, { id: number }>("DELETE FROM payments WHERE id = $id").run({ id }).changes > 0;
}

/** Cambia el estado de una factura fiada entre `pending` y `paid` (nunca toca las anuladas). */
export function setCreditInvoiceStatus(id: number, status: "pending" | "paid", db: Database = getDb()): void {
  db.query<unknown, { id: number; status: string }>(
    "UPDATE invoices SET status = $status WHERE id = $id AND payment_type = 'credit' AND status <> 'void'",
  ).run({ id, status });
}
