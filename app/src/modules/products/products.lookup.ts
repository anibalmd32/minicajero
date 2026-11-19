import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { NotFoundError } from "../../lib/http-errors";
import { normalizeProductCode, PRODUCT_CODE_MAX_LENGTH } from "../../lib/product-code";
import { getLowStockThreshold } from "../settings/settings.service";
import { findProductById, findProductIdByCode } from "./products.repository";
import type { Product, ProductRow } from "./products.types";

export function toProduct(row: ProductRow, lowStockThreshold: number): Product {
  return { ...row, active: row.active === 1, low_stock: row.stock <= lowStockThreshold };
}

export function findProductOrThrow(id: number, db: Database): ProductRow {
  const row = findProductById(id, db);
  if (!row) throw new NotFoundError("Producto no encontrado");
  return row;
}

/** Producto por id; 404 si no existe. */
export function getProduct(id: number, db: Database = getDb()): Product {
  return toProduct(findProductOrThrow(id, db), getLowStockThreshold(db));
}

/**
 * Producto con ese código exacto, sin distinguir mayúsculas (activo o no: quien llama decide si se puede vender).
 * 404 si el código no es válido o no lo tiene ningún producto.
 */
export function getProductByCode(rawCode: string, db: Database = getDb()): Product {
  const code = normalizeProductCode(rawCode);
  const id = code === null ? null : findProductIdByCode(code, db);
  if (id === null)
    throw new NotFoundError(`No hay ningún producto con el código ${rawCode.trim().slice(0, PRODUCT_CODE_MAX_LENGTH)}`);
  return getProduct(id, db);
}
