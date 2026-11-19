import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { createTestDatabase } from "../../test-support/test-database";
import { createCustomer, deleteCustomer, getCustomer, updateCustomer } from "./customers.service";
import { addInvoice, addPayment, juan } from "./customers.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function expectDocumentConflict(action: () => unknown): void {
  try {
    action();
    throw new Error("Se esperaba un conflicto");
  } catch (err) {
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).details?.doc_number).toContain("V-12345678");
  }
}

test("crea, consulta, actualiza y elimina un cliente", () => {
  const created = createCustomer({ ...juan, phone: "0414 555 1234" }, db);
  expect(created).toMatchObject({
    first_name: "Juan Carlos",
    doc_number: "12345678",
    document: "V-12345678",
    phone: "04145551234",
    balance_usd_cents: 0,
  });
  expect(getCustomer(created.id, db)).toEqual(created);

  const updated = updateCustomer(created.id, { ...juan, first_name: "Juan", phone: null }, db);
  expect(updated.first_name).toBe("Juan");
  expect(updated.phone).toBeNull();

  deleteCustomer(created.id, db);
  expect(() => getCustomer(created.id, db)).toThrow(NotFoundError);
  expect(() => deleteCustomer(created.id, db)).toThrow(NotFoundError);
  expect(() => updateCustomer(created.id, juan, db)).toThrow(NotFoundError);
});

test("responde 409 con detalle si el documento ya existe", () => {
  const first = createCustomer(juan, db);
  const other = createCustomer({ ...juan, doc_number: "87654321" }, db);
  expectDocumentConflict(() => createCustomer({ ...juan, doc_number: "12345678" }, db));
  expectDocumentConflict(() => updateCustomer(other.id, juan, db));
  expect(updateCustomer(first.id, juan, db).id).toBe(first.id);
  expect(createCustomer({ ...juan, doc_type: "E" }, db).document).toBe("E-12345678");
});

test("el RIF conserva su identidad y detecta duplicados equivalentes", () => {
  const company = { first_name: "Inversiones", last_name: "Delta", doc_type: "J" };
  const created = createCustomer({ ...company, doc_number: "J-01234567-8" }, db);
  expect(created).toMatchObject({ doc_number: "012345678", document: "J-01234567-8" });
  expect(createCustomer({ ...company, doc_number: "J-12345678-0" }, db).document).toBe("J-12345678-0");
  expect(() => createCustomer({ ...company, doc_number: "J-1234567-8" }, db)).toThrow(ConflictError);
});

test("no elimina clientes con facturas", () => {
  const customer = createCustomer(juan, db);
  addInvoice(db, customer.id, "paid", 1000);
  expect(() => deleteCustomer(customer.id, db)).toThrow(ConflictError);
  expect(getCustomer(customer.id, db).id).toBe(customer.id);
});

test("el saldo suma pendientes menos abonos e ignora pagadas y anuladas", () => {
  const customer = createCustomer(juan, db);
  const pending = addInvoice(db, customer.id, "pending", 5000);
  addInvoice(db, customer.id, "pending", 2500);
  addInvoice(db, customer.id, "paid", 9999);
  addInvoice(db, customer.id, "void", 7777);
  addPayment(db, pending, 1000);
  addPayment(db, pending, 500);
  expect(getCustomer(customer.id, db).balance_usd_cents).toBe(6000);
});
