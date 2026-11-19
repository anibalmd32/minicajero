import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { findInvoiceOrThrow, getInvoice } from "../invoices/invoice-detail";
import type { InvoiceDetail } from "../invoices/invoice-listing.types";
import { applyPayment, requirePayment } from "./payment-apply";
import { fitToBalance } from "./payment-conversion";
import { assertPayable, convertOrThrow, exceedsBalanceError, rateForPayment } from "./payment-guards";
import { validatePayment } from "./payment-validation";
import { deletePaymentRow, findPaymentById, setCreditInvoiceStatus } from "./payments.repository";
import type { InvoicePaymentResult } from "./payments.types";

export { recordCustomerPayment } from "./customer-payment";
export { buildStatementEntries, getCustomerStatement } from "./customer-statement";
export { allocateFifo, convertPayment, fitToBalance, SETTLE_TOLERANCE_CENTS } from "./payment-conversion";
export { validatePayment } from "./payment-validation";
export type {
  AppliedPayment,
  CustomerPaymentResult,
  InvoicePaymentResult,
  PaymentAllocation,
  PaymentAmounts,
  PaymentRequest,
} from "./payments.types";
export type { CustomerStatement, StatementEntry, StatementSummary } from "./statement.types";

/**
 * Registra un abono a una factura fiada pendiente en una transacción: lo convierte con la tasa vigente (409 si no
 * hay o si cambió respecto a `expected_rate`), guarda ambos montos, la moneda y la tasa, y si el saldo llega a 0 la
 * factura pasa a `paid`. 404 si no existe; 409 si no está pendiente o si el abono supera el saldo (con el disponible).
 */
export function recordInvoicePayment(
  invoiceId: number,
  body: JsonObject,
  db: Database = getDb(),
): InvoicePaymentResult {
  const request = validatePayment(body);
  const paymentId = db
    .transaction(() => {
      const invoice = findInvoiceOrThrow(invoiceId, db);
      assertPayable(invoice);
      const rate = rateForPayment(request, db);
      const amounts = fitToBalance(convertOrThrow(request, rate), request.currency, invoice.balance_usd_cents);
      if (!amounts)
        throw exceedsBalanceError(`de la factura #${invoice.number}`, invoice.balance_usd_cents, request, rate);
      return applyPayment(invoice, amounts, request, rate, db);
    })
    .immediate();
  return { payment: requirePayment(paymentId, db), invoice: getInvoice(invoiceId, db) };
}

/**
 * Revierte (elimina) un abono registrado por error. Si la factura estaba pagada vuelve a `pending`.
 * 404 si el abono no existe; 409 si su factura está anulada (sus abonos se conservan como registro).
 */
export function deletePayment(paymentId: number, db: Database = getDb()): InvoiceDetail {
  const invoiceId = db
    .transaction(() => {
      const payment = findPaymentById(paymentId, db);
      if (!payment) throw new NotFoundError("Abono no encontrado");
      const invoice = findInvoiceOrThrow(payment.invoice_id, db);
      if (invoice.status === "void") {
        throw new ConflictError(`La factura #${invoice.number} está anulada: sus abonos se conservan como registro`);
      }
      deletePaymentRow(paymentId, db);
      setCreditInvoiceStatus(invoice.id, "pending", db);
      return invoice.id;
    })
    .immediate();
  return getInvoice(invoiceId, db);
}
