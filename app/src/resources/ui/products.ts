import { fromCents } from "../../lib/money";
import { api } from "./api";
import { formatInteger } from "./format";
import type { ListPage } from "./list";

/** Producto devuelto por `/api/v1/products`, con su precio en centavos USD. */
export interface Product {
  id: number;
  code: string | null;
  name: string;
  price_usd_cents: number;
  stock: number;
  active: boolean;
  low_stock: boolean;
  created_at: string;
  updated_at: string;
}

/** Página del listado de productos con el umbral de stock bajo aplicado. */
export interface ProductPage extends ListPage<Product> {
  low_stock_threshold: number;
}

/** Filtro rápido del inventario. */
export type ProductFilter = "all" | "low" | "out" | "inactive";

/** Criterios del listado: texto libre (código o nombre) y filtro rápido. */
export interface ProductSearch {
  q: string;
  filter: ProductFilter;
  limit: number;
  offset: number;
}

/** Datos del formulario de producto. Los números que no se pudieron interpretar se envían como texto para que el servidor explique el error. */
export interface ProductInput {
  code: string;
  name: string;
  price_usd: number | string | null;
  active: boolean;
  stock?: number | string | null;
}

/** Ajuste de stock: sumar o restar (`delta`) o fijar (`set`). */
export type StockAdjustmentInput =
  | { delta: number | string | null; reason: string }
  | { set: number | string | null; reason: string };

const FILTER_QUERIES: Record<ProductFilter, { active?: number; low_stock?: number; out_of_stock?: number }> = {
  all: {},
  low: { active: 1, low_stock: 1 },
  out: { active: 1, out_of_stock: 1 },
  inactive: { active: 0 },
};

/** Busca productos. "Stock bajo" y "Sin stock" se limitan a productos activos. */
export function fetchProducts(search: ProductSearch): Promise<ProductPage> {
  return api.get<ProductPage>("/products", {
    q: search.q,
    ...FILTER_QUERIES[search.filter],
    limit: search.limit,
    offset: search.offset,
  });
}

/** Registra un producto nuevo. */
export function createProduct(input: ProductInput): Promise<Product> {
  return api.post<Product>("/products", input);
}

/** Reemplaza los datos editables de un producto (el stock se cambia con `adjustProductStock`). */
export function updateProduct(id: number, input: ProductInput): Promise<Product> {
  return api.put<Product>(`/products/${id}`, input);
}

/** Activa o desactiva un producto conservando el resto de sus datos. */
export function setProductActive(product: Product, active: boolean): Promise<Product> {
  return updateProduct(product.id, {
    code: product.code ?? "",
    name: product.name,
    price_usd: fromCents(product.price_usd_cents),
    active,
  });
}

/** Ajusta el stock de un producto y devuelve el producto actualizado. */
export function adjustProductStock(id: number, adjustment: StockAdjustmentInput): Promise<Product> {
  return api.patch<Product>(`/products/${id}/stock`, adjustment);
}

/** Elimina un producto (el servidor responde 409 si tiene ventas). */
export function deleteProduct(id: number): Promise<void> {
  return api.delete(`/products/${id}`);
}

/** Nombre para mensajes: `Nombre (CÓDIGO)` o solo el nombre si no tiene código. */
export function productLabel(product: Pick<Product, "code" | "name">): string {
  return product.code ? `${product.name} (${product.code})` : product.name;
}

/** `1 unidad` / `12 unidades`. */
export function unitsLabel(count: number): string {
  return `${formatInteger(count)} ${Math.abs(count) === 1 ? "unidad" : "unidades"}`;
}

/** Productos activos que se pueden vender, buscando por código o nombre (el de código exacto primero). */
export function searchSaleProducts(q: string, limit: number): Promise<ProductPage> {
  return api.get<ProductPage>("/products", { q, active: 1, limit, offset: 0 });
}

/** Datos actuales de un producto. */
export function fetchProduct(id: number): Promise<Product> {
  return api.get<Product>(`/products/${id}`);
}

/** Producto con ese código exacto (sin distinguir mayúsculas), activo o no. Lanza `ApiError` 404 si no existe. */
export function fetchProductByCode(code: string): Promise<Product> {
  return api.get<Product>("/products/by-code", { code });
}
