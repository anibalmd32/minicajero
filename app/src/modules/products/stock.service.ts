import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject, Pagination } from "../../lib/request";
import { findProductOrThrow, getProduct } from "./products.lookup";
import { type Product, STOCK_MAX, type StockAdjustment, type StockMovementPage } from "./products.types";
import { validateStockAdjustment } from "./stock-adjustment-validation";
import {
  applyStockDelta,
  countStockMovements,
  findProductStock,
  insertStockMovement,
  listStockMovements,
} from "./stock-movements.repository";

function units(count: number): string {
  return count === 1 ? "1 unidad" : `${count} unidades`;
}

function insufficientStockError(available: number, requested: number): ConflictError {
  const message = `Stock insuficiente: hay ${units(available)} y se intentan retirar ${units(requested)}`;
  return new ConflictError(message, { delta: `Como máximo puedes retirar ${units(available)}` });
}

function stockMaxExceededError(): BadRequestError {
  return new BadRequestError("Revisa el ajuste de stock", {
    delta: `El stock resultante no puede superar ${STOCK_MAX.toLocaleString("es-VE")} unidades`,
  });
}

function deltaOf(adjustment: StockAdjustment, current: number): number {
  return adjustment.kind === "set" ? adjustment.stock - current : adjustment.delta;
}

function applyAdjustment(id: number, adjustment: StockAdjustment, db: Database): void {
  const current = findProductStock(id, db);
  if (current === null) throw new NotFoundError("Producto no encontrado");
  const delta = deltaOf(adjustment, current);
  if (delta === 0) return;
  if (current + delta < 0) throw insufficientStockError(current, -delta);
  if (current + delta > STOCK_MAX) throw stockMaxExceededError();
  const stockAfter = applyStockDelta(id, delta, db);
  if (stockAfter === null) throw insufficientStockError(current, -delta);
  insertStockMovement(id, delta, stockAfter, adjustment.reason, db);
}

/**
 * Ajusta el stock sumando `delta` o fijando `set` y lo anota en el historial con su motivo.
 * 404 si el producto no existe, 409 si el stock quedaría negativo y 400 si superaría el máximo.
 * Un ajuste que no cambia el stock no se registra.
 */
export function adjustStock(id: number, body: JsonObject, db: Database = getDb()): Product {
  const adjustment = validateStockAdjustment(body);
  db.transaction(() => applyAdjustment(id, adjustment, db)).immediate();
  return getProduct(id, db);
}

/** Historial de movimientos de stock de un producto (más recientes primero); 404 si no existe. */
export function getStockMovements(id: number, page: Pagination, db: Database = getDb()): StockMovementPage {
  findProductOrThrow(id, db);
  return {
    items: listStockMovements(id, page.limit, page.offset, db),
    total: countStockMovements(id, db),
    limit: page.limit,
    offset: page.offset,
  };
}
