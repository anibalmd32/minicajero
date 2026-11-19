import type { BunRequest } from "bun";
import { json } from "../../lib/http";
import { parseIdParam, readJson } from "../../lib/request";
import { deletePayment, getCustomerStatement, recordCustomerPayment, recordInvoicePayment } from "./payments.service";

/** POST /api/v1/invoices/:id/payments — registra un abono (USD o Bs) a una factura fiada pendiente. */
export async function createInvoicePaymentHandler(req: BunRequest<"/api/v1/invoices/:id/payments">): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(recordInvoicePayment(id, await readJson(req)), 201);
}

/** DELETE /api/v1/payments/:id — revierte un abono y devuelve la factura actualizada. */
export function deletePaymentHandler(req: BunRequest<"/api/v1/payments/:id">): Response {
  return json(deletePayment(parseIdParam(req.params.id)));
}

/** POST /api/v1/customers/:id/payments — abono global repartido entre las facturas pendientes más antiguas primero. */
export async function createCustomerPaymentHandler(
  req: BunRequest<"/api/v1/customers/:id/payments">,
): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(recordCustomerPayment(id, await readJson(req)), 201);
}

/** GET /api/v1/customers/:id/statement — estado de cuenta con movimientos cronológicos y saldo acumulado. */
export function getCustomerStatementHandler(req: BunRequest<"/api/v1/customers/:id/statement">): Response {
  return json(getCustomerStatement(parseIdParam(req.params.id)));
}
