import type { BunRequest } from "bun";
import { json, noContent } from "../../lib/http";
import { parseIdParam, parsePagination, readJson } from "../../lib/request";
import { createCustomer, deleteCustomer, getCustomer, searchCustomers, updateCustomer } from "./customers.service";

type CustomerRequest = BunRequest<"/api/v1/customers/:id">;

/** GET /api/v1/customers?q&debtors&limit&offset — listado con búsqueda, saldo y filtro de deudores. */
export function listCustomersHandler(req: Request): Response {
  const url = new URL(req.url);
  const query = { q: url.searchParams.get("q"), debtors: url.searchParams.get("debtors") };
  return json(searchCustomers(query, parsePagination(url)));
}

/** POST /api/v1/customers — registra un cliente. */
export async function createCustomerHandler(req: Request): Promise<Response> {
  return json(createCustomer(await readJson(req)), 201);
}

/** GET /api/v1/customers/:id — cliente con su saldo pendiente. */
export function getCustomerHandler(req: CustomerRequest): Response {
  return json(getCustomer(parseIdParam(req.params.id)));
}

/** PUT /api/v1/customers/:id — reemplaza los datos del cliente. */
export async function updateCustomerHandler(req: CustomerRequest): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(updateCustomer(id, await readJson(req)));
}

/** DELETE /api/v1/customers/:id — elimina un cliente sin facturas. */
export function deleteCustomerHandler(req: CustomerRequest): Response {
  deleteCustomer(parseIdParam(req.params.id));
  return noContent();
}
