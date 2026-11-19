import { expect, test } from "bun:test";
import { openDatabase } from "./connection";
import { migrations } from "./migrations";
import { type Migration, runMigrations } from "./migrator";

function memoryDb() {
  return openDatabase(":memory:");
}

test("aplica el esquema y no lo reaplica", () => {
  const db = memoryDb();
  const first = runMigrations(db, migrations);
  expect(first.applied).toEqual(migrations.map((m) => m.version));
  const second = runMigrations(db, migrations);
  expect(second.applied).toEqual([]);
  expect(second.currentVersion).toBe(first.currentVersion);
});

test("revierte una migración fallida sin dejar rastro", () => {
  const db = memoryDb();
  const broken: Migration[] = [
    { version: 1, name: "ok", up: "CREATE TABLE a (id INTEGER PRIMARY KEY)" },
    { version: 2, name: "rota", up: "CREATE TABLE b (id INTEGER); INSERT INTO nada VALUES (1);" },
  ];
  expect(() => runMigrations(db, broken)).toThrow(/migración 2/);
  const tables = db.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  expect(tables.map((t) => t.name)).not.toContain("b");
  expect(db.query("SELECT version FROM schema_migrations").all()).toEqual([{ version: 1 }]);
});

test("rechaza versiones desordenadas o desconocidas", () => {
  const db = memoryDb();
  expect(() =>
    runMigrations(db, [
      { version: 2, name: "b", up: "SELECT 1" },
      { version: 1, name: "a", up: "SELECT 1" },
    ]),
  ).toThrow(/mal ordenadas/);
  runMigrations(db, [{ version: 5, name: "futura", up: "SELECT 1" }]);
  expect(() => runMigrations(db, [{ version: 1, name: "a", up: "SELECT 1" }])).toThrow(/desconocidas/);
});

test("la migración 2 rellena las claves de búsqueda de clientes existentes", () => {
  const db = memoryDb();
  runMigrations(db, migrations.slice(0, 1));
  db.run(
    "INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES ('José Ángel', 'NÚÑEZ', 'V', '1')",
  );
  runMigrations(db, migrations);
  expect(db.query("SELECT first_name_key, last_name_key FROM customers").get()).toEqual({
    first_name_key: "jose angel",
    last_name_key: "nunez",
  });
});

test("la migración 4 rellena el texto de búsqueda de clientes y productos existentes", () => {
  const db = memoryDb();
  runMigrations(db, migrations.slice(0, 3));
  db.run(
    "INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES ('José  Ángel', 'NÚÑEZ', 'V', '1')",
  );
  db.run(
    "INSERT INTO products (code, name, price_usd_cents) VALUES ('JP-01', 'Jugo de Piña', 100), (NULL, 'Café', 50)",
  );
  const result = runMigrations(db, migrations);
  expect(result.applied).toContain(4);
  expect(db.query("SELECT search_text FROM customers").all()).toEqual([{ search_text: "jose angel nunez" }]);
  expect(db.query("SELECT search_text FROM products ORDER BY id").all()).toEqual([
    { search_text: "jugo de pina jp-01" },
    { search_text: "cafe" },
  ]);
});

test("la migración 6 conserva los abonos y no reutiliza el id de uno eliminado", () => {
  const db = memoryDb();
  runMigrations(db, migrations.slice(0, 5));
  db.run("INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES ('Ana', 'Pérez', 'V', '1')");
  db.run(
    `INSERT INTO invoices (number, customer_id, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents,
       total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents)
     VALUES (1, 1, 'pending', 'credit', 40, 1000, 0, 1000, 40000, 0, 40000)`,
  );
  const insertPayment = db.query(
    "INSERT INTO payments (invoice_id, amount_usd_cents, amount_bs_cents, currency, rate) VALUES (1, 100, 4000, 'USD', 40) RETURNING id",
  );
  insertPayment.get();
  insertPayment.get();
  const result = runMigrations(db, migrations);
  expect(result.applied).toEqual([6, 7]);
  expect(db.query("SELECT id, amount_bs_cents FROM payments ORDER BY id").all()).toEqual([
    { id: 1, amount_bs_cents: 4000 },
    { id: 2, amount_bs_cents: 4000 },
  ]);
  db.run("DELETE FROM payments WHERE id = 2");
  expect(insertPayment.get()).toEqual({ id: 3 });
});
