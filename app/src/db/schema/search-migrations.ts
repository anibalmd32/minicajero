import type { Database } from "bun:sqlite";
import { searchKey, searchText } from "../../lib/text";
import { NOW } from "./sql-now";

export function addCustomerSearchKeys(db: Database): void {
  db.run(`
    ALTER TABLE customers ADD COLUMN first_name_key TEXT NOT NULL DEFAULT '';
    ALTER TABLE customers ADD COLUMN last_name_key TEXT NOT NULL DEFAULT '';
    DROP INDEX idx_customers_name;
    DROP INDEX idx_customers_last_name;
    CREATE INDEX idx_customers_name_key ON customers (first_name_key, last_name_key);
  `);
  const rows = db.query<{ id: number; first_name: string; last_name: string }, []>(
    "SELECT id, first_name, last_name FROM customers",
  );
  const update = db.query("UPDATE customers SET first_name_key = ?, last_name_key = ? WHERE id = ?");
  for (const row of rows.all()) update.run(searchKey(row.first_name), searchKey(row.last_name), row.id);
}

export function addInventorySupport(db: Database): void {
  db.run(`
    ALTER TABLE products ADD COLUMN name_key TEXT NOT NULL DEFAULT '';
    DROP INDEX idx_products_name;
    DROP INDEX idx_products_active_name;
    CREATE INDEX idx_products_name_key ON products (name_key);
    CREATE INDEX idx_products_active_name_key ON products (active, name_key);
    CREATE TABLE stock_movements (
      id          INTEGER PRIMARY KEY,
      product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      delta       INTEGER NOT NULL CHECK (delta <> 0),
      stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
      reason      TEXT,
      created_at  TEXT    NOT NULL DEFAULT ${NOW}
    ) STRICT;
    CREATE INDEX idx_stock_movements_product ON stock_movements (product_id, id DESC);
    INSERT OR IGNORE INTO settings (key, value) VALUES ('low_stock_threshold', '5');
  `);
  const rows = db.query<{ id: number; name: string }, []>("SELECT id, name FROM products");
  const update = db.query("UPDATE products SET name_key = ? WHERE id = ?");
  for (const row of rows.all()) update.run(searchKey(row.name), row.id);
}

export function addSearchText(db: Database): void {
  db.run(`
    ALTER TABLE customers ADD COLUMN search_text TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN search_text TEXT NOT NULL DEFAULT '';
  `);
  const customers = db.query<{ id: number; first_name: string; last_name: string }, []>(
    "SELECT id, first_name, last_name FROM customers",
  );
  const updateCustomer = db.query("UPDATE customers SET search_text = ? WHERE id = ?");
  for (const row of customers.all()) updateCustomer.run(searchText(row.first_name, row.last_name), row.id);
  const products = db.query<{ id: number; name: string; code: string | null }, []>(
    "SELECT id, name, code FROM products",
  );
  const updateProduct = db.query("UPDATE products SET search_text = ? WHERE id = ?");
  for (const row of products.all()) updateProduct.run(searchText(row.name, row.code), row.id);
}
