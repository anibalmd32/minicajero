import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { escapeLike, searchKey, searchText } from "../../lib/text";
import type { ProductData, ProductFilter, ProductRow } from "./products.types";

export type { ProductData, ProductFilter, ProductRow, StockMovementRow } from "./products.types";
export {
  applyStockDelta,
  countStockMovements,
  findProductStock,
  insertStockMovement,
  listStockMovements,
} from "./stock-movements.repository";

type Params = Record<string, string | number | null>;

const SELECT_PRODUCT = `SELECT p.id, p.code, p.name, p.price_usd_cents, p.stock, p.active, p.created_at, p.updated_at
FROM products p`;

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function buildWhere(filter: ProductFilter): { where: string; params: Params } {
  const params: Params = {};
  const conditions = filter.terms.map((term, index) => {
    params[`term_${index}`] = `%${escapeLike(term)}%`;
    return `p.search_text LIKE $term_${index} ESCAPE '\\'`;
  });
  if (filter.active !== null) {
    params.active = filter.active ? 1 : 0;
    conditions.push("p.active = $active");
  }
  if (filter.maxStock !== null) {
    params.max_stock = filter.maxStock;
    conditions.push("p.stock <= $max_stock");
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

/** Página de productos que cumplen el filtro: primero el de código exacto (si lo hay) y luego por nombre. */
export function listProducts(
  filter: ProductFilter,
  limit: number,
  offset: number,
  db: Database = getDb(),
): ProductRow[] {
  const { where, params } = buildWhere(filter);
  const exactFirst = filter.exactCode === null ? "" : "CASE WHEN p.code = $exact_code THEN 0 ELSE 1 END,";
  if (filter.exactCode !== null) params.exact_code = filter.exactCode;
  return db
    .query<ProductRow, Params>(
      `${SELECT_PRODUCT} ${where} ORDER BY ${exactFirst} p.name_key, p.id LIMIT $limit OFFSET $offset`,
    )
    .all({ ...params, limit, offset });
}

/** Total de productos que cumplen el filtro. */
export function countProducts(filter: ProductFilter, db: Database = getDb()): number {
  const { where, params } = buildWhere(filter);
  return (
    db.query<{ total: number }, Params>(`SELECT COUNT(*) AS total FROM products p ${where}`).get(params)?.total ?? 0
  );
}

/** Producto por id, o `null` si no existe. */
export function findProductById(id: number, db: Database = getDb()): ProductRow | null {
  return db.query<ProductRow, { id: number }>(`${SELECT_PRODUCT} WHERE p.id = $id`).get({ id });
}

/** Id del producto con ese código (sin distinguir mayúsculas), o `null` si no existe. */
export function findProductIdByCode(code: string, db: Database = getDb()): number | null {
  return (
    db.query<{ id: number }, { code: string }>("SELECT id FROM products WHERE code = $code").get({ code })?.id ?? null
  );
}

type ProductRecord = Omit<ProductData, "active"> & { active: number; name_key: string; search_text: string };

function toRecord(data: ProductData): ProductRecord {
  return {
    ...data,
    active: data.active ? 1 : 0,
    name_key: searchKey(data.name),
    search_text: searchText(data.name, data.code),
  };
}

/** Inserta un producto con su stock inicial y devuelve su id. */
export function insertProduct(data: ProductData, stock: number, db: Database = getDb()): number {
  const row = db
    .query<{ id: number }, ProductRecord & { stock: number }>(
      `INSERT INTO products (code, name, name_key, search_text, price_usd_cents, stock, active)
       VALUES ($code, $name, $name_key, $search_text, $price_usd_cents, $stock, $active)
       RETURNING id`,
    )
    .get({ ...toRecord(data), stock });
  if (!row) throw new Error("No se pudo registrar el producto");
  return row.id;
}

/** Actualiza los datos de un producto; devuelve `false` si no existe. Solo toca `updated_at` si algo cambia. */
export function updateProduct(id: number, data: ProductData, db: Database = getDb()): boolean {
  const exists = db.query<{ id: number }, { id: number }>("SELECT id FROM products WHERE id = $id").get({ id });
  if (!exists) return false;
  db.query<unknown, ProductRecord & { id: number }>(
    `UPDATE products
     SET code = $code, name = $name, name_key = $name_key, search_text = $search_text,
         price_usd_cents = $price_usd_cents, active = $active, updated_at = ${NOW}
     WHERE id = $id
       AND (code IS NOT $code COLLATE BINARY OR name IS NOT $name OR price_usd_cents IS NOT $price_usd_cents
            OR active IS NOT $active OR search_text IS NOT $search_text)`,
  ).run({ ...toRecord(data), id });
  return true;
}

/** Elimina un producto (y su historial de stock); devuelve `false` si no existía. */
export function deleteProduct(id: number, db: Database = getDb()): boolean {
  return db.query<unknown, { id: number }>("DELETE FROM products WHERE id = $id").run({ id }).changes > 0;
}

/** Cantidad de líneas de factura (de cualquier estado) que incluyen el producto. */
export function countProductSales(id: number, db: Database = getDb()): number {
  return (
    db
      .query<{ total: number }, { id: number }>("SELECT COUNT(*) AS total FROM invoice_items WHERE product_id = $id")
      .get({ id })?.total ?? 0
  );
}
