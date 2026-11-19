import type { Database } from "bun:sqlite";

type InvoiceStatus = "paid" | "pending" | "void";

export const juan = { first_name: "  Juan   Carlos ", last_name: "Pérez", doc_type: "V", doc_number: "12.345.678" };

function nextInvoiceNumber(db: Database): number {
  return db.query<{ next: number }, []>("SELECT COALESCE(MAX(number), 0) + 1 AS next FROM invoices").get()?.next ?? 1;
}

/** Inserta una factura mínima a tasa 40 y devuelve su id. */
export function addInvoice(db: Database, customerId: number | null, status: InvoiceStatus, totalUsdCents: number) {
  const row = db
    .query<{ id: number }, Record<string, string | number | null>>(
      `INSERT INTO invoices (number, customer_id, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents,
         total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents, voided_at)
       VALUES ($number, $customer_id, $status, $payment_type, 40, $total, 0, $total, $total_bs, 0, $total_bs, $voided_at)
       RETURNING id`,
    )
    .get({
      number: nextInvoiceNumber(db),
      customer_id: customerId,
      status,
      payment_type: status === "pending" ? "credit" : "cash",
      total: totalUsdCents,
      total_bs: totalUsdCents * 40,
      voided_at: status === "void" ? "2026-01-01T00:00:00.000Z" : null,
    });
  if (!row) throw new Error("No se pudo crear la factura de prueba");
  return row.id;
}

/** Registra un abono en USD a tasa 40. */
export function addPayment(db: Database, invoiceId: number, amountUsdCents: number): void {
  db.query(
    "INSERT INTO payments (invoice_id, amount_usd_cents, amount_bs_cents, currency, rate) VALUES (?, ?, ?, 'USD', 40)",
  ).run(invoiceId, amountUsdCents, amountUsdCents * 40);
}
