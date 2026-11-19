import type { BunRequest } from "bun";
import { json, noContent } from "../../lib/http";
import { parseIdParam, parsePagination, readJson } from "../../lib/request";
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getProduct,
  getProductByCode,
  getStockMovements,
  searchProducts,
  updateProduct,
} from "./products.service";

type ProductRequest = BunRequest<"/api/v1/products/:id">;
type ProductStockRequest = BunRequest<"/api/v1/products/:id/stock">;
type ProductMovementsRequest = BunRequest<"/api/v1/products/:id/stock-movements">;

/** GET /api/v1/products?q&active&low_stock&out_of_stock&limit&offset — listado con búsqueda por código o nombre. */
export function listProductsHandler(req: Request): Response {
  const url = new URL(req.url);
  const params = url.searchParams;
  const query = {
    q: params.get("q"),
    active: params.get("active"),
    low_stock: params.get("low_stock"),
    out_of_stock: params.get("out_of_stock"),
  };
  return json(searchProducts(query, parsePagination(url)));
}

/** POST /api/v1/products — registra un producto (precio en USD decimal). */
export async function createProductHandler(req: Request): Promise<Response> {
  return json(createProduct(await readJson(req)), 201);
}

/** GET /api/v1/products/:id — producto por id. */
export function getProductHandler(req: ProductRequest): Response {
  return json(getProduct(parseIdParam(req.params.id)));
}

/** GET /api/v1/products/by-code?code= — producto con ese código exacto (sin distinguir mayúsculas); 404 si no hay. */
export function getProductByCodeHandler(req: Request): Response {
  return json(getProductByCode(new URL(req.url).searchParams.get("code") ?? ""));
}

/** PUT /api/v1/products/:id — reemplaza código, nombre, precio y estado del producto. */
export async function updateProductHandler(req: ProductRequest): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(updateProduct(id, await readJson(req)));
}

/** DELETE /api/v1/products/:id — elimina un producto sin ventas. */
export function deleteProductHandler(req: ProductRequest): Response {
  deleteProduct(parseIdParam(req.params.id));
  return noContent();
}

/** PATCH /api/v1/products/:id/stock — ajusta el stock con `{ delta }` o `{ set }` y un motivo opcional. */
export async function adjustStockHandler(req: ProductStockRequest): Promise<Response> {
  const id = parseIdParam(req.params.id);
  return json(adjustStock(id, await readJson(req)));
}

/** GET /api/v1/products/:id/stock-movements?limit&offset — historial de movimientos de stock. */
export function listStockMovementsHandler(req: ProductMovementsRequest): Response {
  const id = parseIdParam(req.params.id);
  return json(getStockMovements(id, parsePagination(new URL(req.url))));
}
