import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import { Validator } from "../../lib/validation";
import { type DisplayCurrency, getSettings } from "../settings/settings.service";
import { findInvoiceOrThrow, getInvoice } from "./invoice-detail";
import { formatDualAmount } from "./invoice-format";
import type { VoidedInvoice } from "./invoice-listing.types";
import { listInvoiceItems, markInvoiceVoid } from "./invoices.repository";
import type { InvoiceRow } from "./invoices.types";
import { restoreStock } from "./sale-stock";

const REASON_MAX_LENGTH = 200;

function alreadyVoidError(invoice: InvoiceRow): ConflictError {
  return new ConflictError(`La factura #${invoice.number} ya está anulada`);
}

function refundWarning(invoice: InvoiceRow, primary: DisplayCurrency): string | null {
  if (invoice.payments_usd_cents <= 0) return null;
  const amount = formatDualAmount(invoice.payments_usd_cents, invoice.payments_bs_cents, primary);
  return (
    `La factura #${invoice.number} tenía abonos por ${amount}. ` +
    "Los abonos quedan registrados y no se reintegran automáticamente: devuélvelos al cliente si corresponde."
  );
}

function applyVoid(id: number, reason: string | null, db: Database): InvoiceRow {
  const invoice = findInvoiceOrThrow(id, db);
  if (invoice.status === "void") throw alreadyVoidError(invoice);
  if (!markInvoiceVoid(id, reason === null ? null : collapseSpaces(reason), db)) throw alreadyVoidError(invoice);
  restoreStock(invoice.number, listInvoiceItems(id, db), db);
  return invoice;
}

/**
 * Anula una factura (no se borra): pasa a `void` con fecha y motivo opcional y devuelve al inventario las unidades
 * vendidas (registrando el movimiento). 404 si no existe y 409 si ya estaba anulada.
 * Se permite anular facturas fiadas con abonos: los abonos se conservan como registro y la respuesta lo indica con
 * `refund_usd_cents` y `refund_bs_cents` (lo abonado; los Bs tal como se recibieron en cada abono, con su tasa) y un
 * `warning` con ambos montos (moneda principal primero) para que el operador reintegre el dinero si corresponde.
 */
export function voidInvoice(id: number, body: JsonObject, db: Database = getDb()): VoidedInvoice {
  const v = new Validator(body);
  const reason = v.optionalString("reason", { max: REASON_MAX_LENGTH });
  v.assertValid("Revisa los datos de la anulación");
  const voided = db.transaction(() => applyVoid(id, reason, db)).immediate();
  return {
    ...getInvoice(id, db),
    refund_usd_cents: voided.payments_usd_cents,
    refund_bs_cents: voided.payments_bs_cents,
    warning: refundWarning(voided, getSettings(db).display_currency),
  };
}
