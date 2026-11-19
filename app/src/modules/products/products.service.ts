import { type Database, SQLiteError } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject, Pagination } from "../../lib/request";
import { getLowStockThreshold } from "../settings/settings.service";
import { parseProductFilter } from "./product-filter";
import { validateNewProduct, validateProductUpdate } from "./product-validation";
import { findProductOrThrow, getProduct, toProduct } from "./products.lookup";
import {
  countProductSales,
  countProducts,
  deleteProduct as deleteProductRow,
  findProductIdByCode,
  insertProduct,
  listProducts,
  updateProduct as updateProductRow,
} from "./products.repository";
import type { Product, ProductPage, ProductQuery } from "./products.types";
import { insertStockMovement } from "./stock-movements.repository";

export { parseProductFilter } from "./product-filter";
export { validateNewProduct, validateProductUpdate } from "./product-validation";
export { getProduct, getProductByCode } from "./products.lookup";
export type { Product, ProductPage, ProductQuery, StockAdjustment, StockMovementPage } from "./products.types";
export { adjustStock, getStockMovements } from "./stock.service";
export { validateStockAdjustment } from "./stock-adjustment-validation";

const INITIAL_STOCK_REASON = "Stock inicial";

/** Página de productos filtrada por búsqueda, estado y stock bajo. */
export function searchProducts(query: ProductQuery, page: Pagination, db: Database = getDb()): ProductPage {
  const threshold = getLowStockThreshold(db);
  const filter = parseProductFilter(query, threshold);
  const items = listProducts(filter, page.limit, page.offset, db).map((row) => toProduct(row, threshold));
  return {
    items,
    total: countProducts(filter, db),
    limit: page.limit,
    offset: page.offset,
    low_stock_threshold: threshold,
  };
}

function duplicateCodeError(code: string): ConflictError {
  return new ConflictError(`Ya existe un producto con el código ${code}`, {
    code: `El código ${code} ya está registrado`,
  });
}

function isConstraintError(err: unknown, code: string): boolean {
  return err instanceof SQLiteError && err.code === code;
}

function saveWithCodeCheck<T>(code: string | null, ownId: number | null, db: Database, save: () => T): T {
  try {
    return db
      .transaction(() => {
        const existingId = code === null ? null : findProductIdByCode(code, db);
        if (code !== null && existingId !== null && existingId !== ownId) throw duplicateCodeError(code);
        return save();
      })
      .immediate();
  } catch (err) {
    if (code !== null && isConstraintError(err, "SQLITE_CONSTRAINT_UNIQUE")) throw duplicateCodeError(code);
    throw err;
  }
}

/** Registra un producto; si trae stock inicial queda anotado en su historial. 409 si el código ya existe. */
export function createProduct(body: JsonObject, db: Database = getDb()): Product {
  const { data, stock } = validateNewProduct(body);
  const id = saveWithCodeCheck(data.code, null, db, () => {
    const productId = insertProduct(data, stock, db);
    if (stock > 0) insertStockMovement(productId, stock, stock, INITIAL_STOCK_REASON, db);
    return productId;
  });
  return getProduct(id, db);
}

/** Reemplaza los datos editables de un producto; 404 si no existe y 409 si el código pertenece a otro producto. */
export function updateProduct(id: number, body: JsonObject, db: Database = getDb()): Product {
  const data = validateProductUpdate(body, findProductOrThrow(id, db));
  const updated = saveWithCodeCheck(data.code, id, db, () => updateProductRow(id, data, db));
  if (!updated) throw new NotFoundError("Producto no encontrado");
  return getProduct(id, db);
}

function hasSalesError(salesCount: number): ConflictError {
  const label = salesCount === 1 ? "1 venta registrada" : `${salesCount} ventas registradas`;
  return new ConflictError(
    `No se puede eliminar el producto porque tiene ${label}. Desactívalo para que no aparezca en nuevas ventas.`,
    { active: "Desactiva el producto en lugar de eliminarlo" },
  );
}

/** Elimina un producto sin ventas; 404 si no existe y 409 (sugiriendo desactivarlo) si aparece en alguna factura. */
export function deleteProduct(id: number, db: Database = getDb()): void {
  try {
    db.transaction(() => {
      const salesCount = countProductSales(id, db);
      if (salesCount > 0) throw hasSalesError(salesCount);
      if (!deleteProductRow(id, db)) throw new NotFoundError("Producto no encontrado");
    })();
  } catch (err) {
    if (isConstraintError(err, "SQLITE_CONSTRAINT_FOREIGNKEY")) throw hasSalesError(countProductSales(id, db));
    throw err;
  }
}
