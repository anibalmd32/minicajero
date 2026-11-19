import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { NOW_SQL, SELECT_INVOICE, type SqlParams } from "./invoice-sql";
import type { InvoiceItemData, InvoiceItemRow, InvoiceRow, NewInvoice, PaymentRow } from "./invoices.types";

/** Factura por id, o `null` si no existe. */
export function findInvoiceById(id: number, db: Database = getDb()): InvoiceRow | null {
  return db.query<InvoiceRow, { id: number }>(`${SELECT_INVOICE} WHERE i.id = $id`).get({ id });
}

/** Siguiente número correlativo (el mayor + 1). Llamar dentro de la transacción que inserta la factura. */
export function nextInvoiceNumber(db: Database = getDb()): number {
  return db.query<{ next: number }, []>("SELECT COALESCE(MAX(number), 0) + 1 AS next FROM invoices").get()?.next ?? 1;
}

/** Inserta la cabecera de una factura y devuelve su id. */
export function insertInvoice(invoice: NewInvoice, db: Database = getDb()): number {
  const row = db
    .query<{ id: number }, SqlParams>(
      `INSERT INTO invoices (number, customer_id, status, payment_type, rate, tax_percent,
         subtotal_usd_cents, tax_usd_cents, total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents, notes)
       VALUES ($number, $customer_id, $status, $payment_type, $rate, $tax_percent,
         $subtotal_usd_cents, $tax_usd_cents, $total_usd_cents, $subtotal_bs_cents, $tax_bs_cents, $total_bs_cents, $notes)
       RETURNING id`,
    )
    .get({ ...invoice });
  if (!row) throw new Error("No se pudo registrar la factura");
  return row.id;
}

/** Inserta una línea de factura. */
export function insertInvoiceItem(invoiceId: number, item: InvoiceItemData, db: Database = getDb()): void {
  db.query<unknown, SqlParams>(
    `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_usd_cents,
       unit_price_bs_cents, line_total_usd_cents, line_total_bs_cents)
     VALUES ($invoice_id, $product_id, $product_name, $quantity, $unit_price_usd_cents,
       $unit_price_bs_cents, $line_total_usd_cents, $line_total_bs_cents)`,
  ).run({ ...item, invoice_id: invoiceId });
}

/** Líneas de una factura en el orden en que se registraron, con el código actual del producto. */
export function listInvoiceItems(invoiceId: number, db: Database = getDb()): InvoiceItemRow[] {
  return db
    .query<InvoiceItemRow, { invoice_id: number }>(
      `SELECT it.id, it.invoice_id, it.product_id, p.code AS product_code, it.product_name, it.quantity,
              it.unit_price_usd_cents, it.unit_price_bs_cents, it.line_total_usd_cents, it.line_total_bs_cents
       FROM invoice_items it
       LEFT JOIN products p ON p.id = it.product_id
       WHERE it.invoice_id = $invoice_id
       ORDER BY it.id`,
    )
    .all({ invoice_id: invoiceId });
}

/** Abonos de una factura, del más antiguo al más reciente. */
export function listInvoicePayments(invoiceId: number, db: Database = getDb()): PaymentRow[] {
  return db
    .query<PaymentRow, { invoice_id: number }>(
      `SELECT id, invoice_id, amount_usd_cents, amount_bs_cents, currency, rate, notes, created_at
       FROM payments
       WHERE invoice_id = $invoice_id
       ORDER BY created_at, id`,
    )
    .all({ invoice_id: invoiceId });
}

/** Marca una factura como anulada si aún no lo está; devuelve `false` si no se aplicó. */
export function markInvoiceVoid(id: number, reason: string | null, db: Database = getDb()): boolean {
  return (
    db
      .query<unknown, { id: number; reason: string | null }>(
        `UPDATE invoices SET status = 'void', voided_at = ${NOW_SQL}, void_reason = $reason
         WHERE id = $id AND status <> 'void'`,
      )
      .run({ id, reason }).changes > 0
  );
}
