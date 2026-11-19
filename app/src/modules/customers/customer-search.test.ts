import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import { BadRequestError } from "../../lib/http-errors";
import { createTestDatabase } from "../../test-support/test-database";
import { createCustomer, searchCustomers, updateCustomer } from "./customers.service";
import { addInvoice, addPayment, juan } from "./customers.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function search(q: string | null, debtors: string | null = null) {
  return searchCustomers({ q, debtors }, { limit: 50, offset: 0 }, db);
}

function person(first_name: string, last_name: string, doc_number: string) {
  return createCustomer({ first_name, last_name, doc_type: "V", doc_number }, db);
}

const lastNames = (q: string) => search(q).items.map((c) => c.last_name);
const firstNames = (q: string | null) => search(q).items.map((c) => c.first_name);
const fullNames = (q: string) => search(q).items.map((c) => `${c.first_name} ${c.last_name}`);

test("busca por nombre, documento y teléfono", () => {
  createCustomer({ ...juan, phone: "0412-1234567" }, db);
  createCustomer({ first_name: "María", last_name: "González", doc_type: "E", doc_number: "8123456" }, db);
  createCustomer({ first_name: "Inversiones", last_name: "Delta", doc_type: "J", doc_number: "J-40123456-7" }, db);
  const expected: [string, string[]][] = [
    ["juan", ["Pérez"]],
    ["carlos pér", ["Pérez"]],
    ["V-1234", ["Pérez"]],
    ["v12345678", ["Pérez"]],
    ["E-1234", []],
    ["8123", ["González"]],
    ["J-401234567", ["Delta"]],
    ["J-40123456-7", ["Delta"]],
    ["V 1234", ["Pérez"]],
    ["j 4012", ["Delta"]],
    ["0412-123", ["Pérez"]],
    ["%", []],
  ];
  for (const [q, names] of expected) expect(lastNames(q)).toEqual(names);
  expect(search(null).total).toBe(3);
});

test("busca y ordena sin distinguir mayúsculas ni tildes", () => {
  person("José Ángel", "Núñez", "20111222");
  person("Óscar", "Ávila", "20111223");
  person("Zoe", "Bello", "20111224");
  person("Ana", "Zapata", "20111225");
  for (const q of ["jose", "JOSÉ", "ángel", "ANGEL", "NÚÑEZ", "nunez"]) expect(firstNames(q)).toEqual(["José Ángel"]);
  for (const q of ["oscar", "óscar", "AVILA"]) expect(firstNames(q)).toEqual(["Óscar"]);
  expect(firstNames(null)).toEqual(["Ana", "José Ángel", "Óscar", "Zoe"]);
});

test("la búsqueda sin tildes combina nombre y apellidos y se actualiza al editar", () => {
  const jose = person("José", "Peña Ñáñez", "20111230");
  person("Josefina", "Ruiz", "20111231");
  expect(fullNames("jose")).toEqual(["José Peña Ñáñez", "Josefina Ruiz"]);
  expect(fullNames("jose pena")).toEqual(["José Peña Ñáñez"]);
  expect(fullNames("JOSÉ NANEZ")).toEqual(["José Peña Ñáñez"]);
  expect(fullNames("pena nanez")).toEqual(["José Peña Ñáñez"]);
  updateCustomer(jose.id, { first_name: "Ángel", last_name: "Ávila", doc_type: "V", doc_number: "20111230" }, db);
  expect(fullNames("angel avila")).toEqual(["Ángel Ávila"]);
  expect(fullNames("pena")).toEqual([]);
});

test("la búsqueda por texto usa search_text, no las claves de orden", () => {
  person("José", "Peña", "20111232");
  db.run("UPDATE customers SET first_name_key = '', last_name_key = ''");
  expect(firstNames("jose pena")).toEqual(["José"]);
  db.run("UPDATE customers SET search_text = ''");
  expect(search("jose").total).toBe(0);
});

test("la búsqueda trata % y _ como texto literal", () => {
  person("Ana_Maria", "Pérez", "20111226");
  person("Ana Maria", "Mora", "20111227");
  expect(firstNames("ana_m")).toEqual(["Ana_Maria"]);
  expect(firstNames("%")).toEqual([]);
});

test("filtra deudores y pagina", () => {
  const debtor = createCustomer(juan, db);
  const settled = createCustomer({ ...juan, first_name: "Ana", doc_number: "22333444" }, db);
  createCustomer({ ...juan, first_name: "Luis", doc_number: "11222333" }, db);
  addInvoice(db, debtor.id, "pending", 3000);
  addPayment(db, addInvoice(db, settled.id, "pending", 2000), 2000);

  const debtors = search(null, "1");
  expect(debtors.total).toBe(1);
  expect(debtors.items.map((c) => [c.id, c.balance_usd_cents])).toEqual([[debtor.id, 3000]]);
  expect(search("ana", "1").total).toBe(0);

  const second = searchCustomers({ q: null, debtors: "0" }, { limit: 2, offset: 2 }, db);
  expect(second.total).toBe(3);
  expect(second.items.map((c) => c.first_name)).toEqual(["Luis"]);
});

test("rechaza parámetros de búsqueda inválidos", () => {
  expect(() => search(null, "si")).toThrow(BadRequestError);
  expect(() => search("x".repeat(101))).toThrow(BadRequestError);
});
