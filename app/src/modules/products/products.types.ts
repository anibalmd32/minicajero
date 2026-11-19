import type { Pagination } from "../../lib/request";

/** Producto tal como se guarda: precio en centavos de USD y `active` como 0/1. */
export interface ProductRow {
  id: number;
  code: string | null;
  name: string;
  price_usd_cents: number;
  stock: number;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

/** Datos editables de un producto (el stock se gestiona aparte con ajustes). */
export interface ProductData {
  code: string | null;
  name: string;
  price_usd_cents: number;
  active: boolean;
}

/** Criterios del listado de productos. */
export interface ProductFilter {
  /** Palabras que deben aparecer todas en el texto de búsqueda (nombre y código), ya normalizadas con `searchKey`. */
  terms: string[];
  /** Término completo: un producto con este código exacto aparece primero. */
  exactCode: string | null;
  active: boolean | null;
  /** Si se indica, solo productos con stock menor o igual a este umbral. */
  maxStock: number | null;
}

/** Movimiento de stock registrado. */
export interface StockMovementRow {
  id: number;
  product_id: number;
  delta: number;
  stock_after: number;
  reason: string | null;
  created_at: string;
}

/** Producto tal como lo expone la API: `active` booleano y `low_stock` según el umbral configurado. */
export interface Product extends Omit<ProductRow, "active"> {
  active: boolean;
  low_stock: boolean;
}

/** Página del listado de productos; incluye el umbral de stock bajo aplicado. */
export interface ProductPage extends Pagination {
  items: Product[];
  total: number;
  low_stock_threshold: number;
}

/** Página del historial de movimientos de stock de un producto. */
export interface StockMovementPage extends Pagination {
  items: StockMovementRow[];
  total: number;
}

/** Criterios de búsqueda tal como llegan en la query string. */
export interface ProductQuery {
  q: string | null;
  active: string | null;
  low_stock: string | null;
  out_of_stock: string | null;
}

/** Ajuste de stock ya validado: suma relativa (`delta`) o fijar un valor (`set`). */
export type StockAdjustment =
  | { kind: "delta"; delta: number; reason: string | null }
  | { kind: "set"; stock: number; reason: string | null };

export const STOCK_MAX = 1_000_000_000;
