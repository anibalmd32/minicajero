import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { StockMovementRow } from "./products.types";

type Params = Record<string, string | number | null>;

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

/** Stock actual del producto, o `null` si no existe. */
export function findProductStock(id: number, db: Database = getDb()): number | null {
  return (
    db.query<{ stock: number }, { id: number }>("SELECT stock FROM products WHERE id = $id").get({ id })?.stock ?? null
  );
}

/** Suma `delta` al stock si no queda negativo; devuelve el stock resultante o `null` si no se aplicó. */
export function applyStockDelta(id: number, delta: number, db: Database = getDb()): number | null {
  return (
    db
      .query<{ stock: number }, { id: number; delta: number }>(
        `UPDATE products SET stock = stock + $delta, updated_at = ${NOW}
         WHERE id = $id AND stock + $delta >= 0
         RETURNING stock`,
      )
      .get({ id, delta })?.stock ?? null
  );
}

/** Registra un movimiento de stock. */
export function insertStockMovement(
  productId: number,
  delta: number,
  stockAfter: number,
  reason: string | null,
  db: Database = getDb(),
): void {
  db.query<unknown, Params>(
    `INSERT INTO stock_movements (product_id, delta, stock_after, reason)
     VALUES ($product_id, $delta, $stock_after, $reason)`,
  ).run({ product_id: productId, delta, stock_after: stockAfter, reason });
}

/** Movimientos de stock de un producto, del más reciente al más antiguo. */
export function listStockMovements(
  productId: number,
  limit: number,
  offset: number,
  db: Database = getDb(),
): StockMovementRow[] {
  return db
    .query<StockMovementRow, Params>(
      `SELECT id, product_id, delta, stock_after, reason, created_at
       FROM stock_movements
       WHERE product_id = $product_id
       ORDER BY id DESC
       LIMIT $limit OFFSET $offset`,
    )
    .all({ product_id: productId, limit, offset });
}

/** Total de movimientos de stock de un producto. */
export function countStockMovements(productId: number, db: Database = getDb()): number {
  return (
    db
      .query<{ total: number }, { product_id: number }>(
        "SELECT COUNT(*) AS total FROM stock_movements WHERE product_id = $product_id",
      )
      .get({ product_id: productId })?.total ?? 0
  );
}
