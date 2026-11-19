import type { BunRequest } from "bun";
import { json } from "../../lib/http";
import { parseIdParam, parsePagination, readJson, readOptionalJson } from "../../lib/request";
import { createInvoice, getInvoice, searchInvoices, voidInvoice } from "./invoices.service";

type InvoiceRequest = BunRequest<"/api/v1/invoices/:id">;
type InvoiceVoidRequest = BunRequest<"/api/v1/invoices/:id/void">;

/** GET /api/v1/invoices?q&status&payment_type&customer_id&from&to&limit&offset — listado con totales agregados. */
export function listInvoicesHandler(req: Request): Response {
  const url = new URL(req.url);
  const params = url.searchParams;
  const query = {
    q: params.get("q"),
    status: params.get("status"),
    payment_type: params.get("payment_type"),
    customer_id: params.get("customer_id"),
    from: params.get("from"),
    to: params.get("to"),
  };
  return json(searchInvoices(query, parsePagination(url)));
}

/** POST /api/v1/invoices — registra una venta de contado o fiada y descuenta el stock. */
export async function createInvoiceHandler(req: Request): Promise<Response> {
  return json(createInvoice(await readJson(req)), 201);
}

/** GET /api/v1/invoices/:id — factura con líneas, cliente, abonos y saldo. */
export function getInvoiceHandler(req: InvoiceRequest): Response {
  return json(getInvoice(parseIdParam(req.params.id)));
}

/** POST /api/v1/invoices/:id/void — anula la factura (motivo opcional) y devuelve el stock. */
export async function voidInvoiceHandler(req: InvoiceVoidRequest): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(voidInvoice(id, await readOptionalJson(req)));
}
