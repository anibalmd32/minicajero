import { expect, test } from "bun:test";
import { createTestDatabase } from "../test-support/test-database";

test("crea ajustes por defecto", () => {
  const db = createTestDatabase();
  const rows = db.query<{ key: string; value: string }, []>("SELECT key, value FROM settings").all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  expect(settings.tax_percent).toBe("0");
  expect(settings.display_currency).toBe("USD");
  expect(settings.rate_mode).toBe("auto");
});

test("aplica restricciones de clientes", () => {
  const db = createTestDatabase();
  const insertCustomer = db.query(
    "INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES (?, ?, ?, ?)",
  );
  insertCustomer.run("Ana", "Pérez", "V", "123");
  expect(() => insertCustomer.run("Otra", "Persona", "V", "123")).toThrow(/UNIQUE/);
  expect(() => insertCustomer.run("Ana", "Pérez", "P", "999")).toThrow(/CHECK/);
  insertCustomer.run("Ana", "Pérez", "J", "123");
});

test("aplica restricciones de productos", () => {
  const db = createTestDatabase();
  const insertProduct = db.query("INSERT INTO products (code, name, price_usd_cents, stock) VALUES (?, ?, ?, ?)");
  insertProduct.run(null, "Sin código", 100, 1);
  insertProduct.run(null, "Otro sin código", 100, 1);
  insertProduct.run("A1", "Con código", 100, 1);
  expect(() => insertProduct.run("a1", "Duplicado", 100, 1)).toThrow(/UNIQUE/);
  expect(() => insertProduct.run(null, "Negativo", -1, 1)).toThrow(/CHECK/);
  expect(() => insertProduct.run(null, "Sin stock", 100, -1)).toThrow(/CHECK/);
  expect(() => insertProduct.run(null, "Decimal", 1.5, 1)).toThrow();
});

test("aplica restricciones de facturas", () => {
  const db = createTestDatabase();
  db.run("INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES ('Ana', 'Pérez', 'V', '1')");
  const insertInvoice = db.query(
    `INSERT INTO invoices (number, customer_id, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents,
       total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents)
     VALUES (?, ?, ?, ?, 40.5, 300, 0, 300, 12150, 0, 12150)`,
  );
  insertInvoice.run(1, null, "paid", "cash");
  insertInvoice.run(2, 1, "pending", "credit");
  expect(() => insertInvoice.run(3, null, "pending", "credit")).toThrow(/CHECK/);
  expect(() => insertInvoice.run(4, null, "pending", "cash")).toThrow(/CHECK/);
  expect(() => insertInvoice.run(1, null, "paid", "cash")).toThrow(/UNIQUE/);
  expect(() => insertInvoice.run(5, 99, "pending", "credit")).toThrow(/FOREIGN KEY/);
});

test("aplica restricciones de líneas de factura", () => {
  const db = createTestDatabase();
  db.run("INSERT INTO products (name, price_usd_cents, stock) VALUES ('Arroz', 150, 10)");
  db.run(
    `INSERT INTO invoices (number, customer_id, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents,
       total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents)
     VALUES (1, NULL, 'paid', 'cash', 40.5, 300, 0, 300, 12150, 0, 12150)`,
  );
  const insertItem = db.query(
    `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_usd_cents,
       unit_price_bs_cents, line_total_usd_cents, line_total_bs_cents)
     VALUES (?, ?, 'Arroz', ?, 150, 6075, 300, 12150)`,
  );
  insertItem.run(1, 1, 2);
  expect(() => insertItem.run(1, 1, 0)).toThrow(/CHECK/);
  expect(() => insertItem.run(1, 42, 1)).toThrow(/FOREIGN KEY/);
});

test("aplica restricciones de pagos y protege al cliente con facturas", () => {
  const db = createTestDatabase();
  db.run("INSERT INTO customers (first_name, last_name, doc_type, doc_number) VALUES ('Ana', 'Pérez', 'V', '1')");
  db.run(
    `INSERT INTO invoices (number, customer_id, status, payment_type, rate, subtotal_usd_cents, tax_usd_cents,
       total_usd_cents, subtotal_bs_cents, tax_bs_cents, total_bs_cents)
     VALUES (2, 1, 'pending', 'credit', 40.5, 300, 0, 300, 12150, 0, 12150)`,
  );
  const insertPayment = db.query(
    "INSERT INTO payments (invoice_id, amount_usd_cents, amount_bs_cents, currency, rate) VALUES (?, 100, 4050, ?, 40.5)",
  );
  insertPayment.run(1, "VES");
  expect(() => insertPayment.run(1, "EUR")).toThrow(/CHECK/);
  expect(() => db.run("DELETE FROM customers WHERE id = 1")).toThrow(/FOREIGN KEY/);
});

test("historial de tasas valida origen y valor", () => {
  const db = createTestDatabase();
  const insertRate = db.query("INSERT INTO exchange_rates (rate, source, api_date) VALUES (?, ?, ?)");
  insertRate.run(36.5, "api", "2026-10-29T12:00:00.000Z");
  insertRate.run(37, "manual", null);
  expect(() => insertRate.run(0, "api", null)).toThrow(/CHECK/);
  expect(() => insertRate.run(36, "otro", null)).toThrow(/CHECK/);
});
