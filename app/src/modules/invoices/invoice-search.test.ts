import type { Database } from "bun:sqlite";
import { beforeEach, expect, test } from "bun:test";
import type { JsonObject } from "../../lib/request";
import { createTestDatabase } from "../../test-support/test-database";
import { voidInvoice } from "./invoices.service";
import { addPayment, customer, errorOf, product, search, sell, setCreatedAt, setRate } from "./invoices.test-support";

let db: Database;

beforeEach(() => {
  db = createTestDatabase();
});

function seed() {
  setRate(db, 40);
  const ana = customer(db, "12345678", "Ana", "Pérez");
  const jose = customer(db, "9876543", "José", "Núñez");
  const pan = product(db, { name: "Pan", price_usd: 1, stock: 100 });
  const sale = (body: JsonObject) => sell(db, { items: [{ product_id: pan, quantity: 1 }], ...body });
  const first = sale({ payment_type: "cash" });
  const second = sale({ payment_type: "credit", customer_id: ana });
  const third = sale({ payment_type: "credit", customer_id: jose });
  const fourth = sale({ payment_type: "cash", customer_id: jose });
  voidInvoice(fourth.id, {}, db);
  addPayment(db, second.id, 40);
  return { ana, jose, first, second, third, fourth };
}

function numbersOf(query: Parameters<typeof search>[1]): number[] {
  return search(db, query).items.map((item) => item.number);
}

test("lista de la más reciente a la más antigua con cliente resumido", () => {
  const { ana, first, second } = seed();
  const result = search(db);
  expect(result.total).toBe(4);
  expect(numbersOf({})).toEqual([4, 3, 2, 1]);
  expect(result.items.find((item) => item.id === first.id)).toMatchObject({
    customer: null,
    status: "paid",
    payments_usd_cents: 0,
  });
  expect(result.items.find((item) => item.id === second.id)).toMatchObject({
    customer: { id: ana, name: "Ana Pérez", document: "V-12345678" },
    payments_usd_cents: 40,
    payments_bs_cents: 1600,
    balance_usd_cents: 60,
  });
});

test("los totales excluyen las anuladas", () => {
  seed();
  expect(search(db).totals).toEqual({
    invoices: 3,
    voided: 1,
    subtotal_usd_cents: 300,
    tax_usd_cents: 0,
    total_usd_cents: 300,
    subtotal_bs_cents: 12_000,
    tax_bs_cents: 0,
    total_bs_cents: 12_000,
    payments_usd_cents: 40,
    collected_usd_cents: 140,
    balance_usd_cents: 160,
  });
});

test("lo cobrado incluye las ventas de contado completas y excluye las anuladas", () => {
  seed();
  expect(search(db, { status: "paid" }).totals).toMatchObject({ payments_usd_cents: 0, collected_usd_cents: 100 });
  expect(search(db, { payment_type: "credit" }).totals).toMatchObject({
    payments_usd_cents: 40,
    collected_usd_cents: 40,
  });
  expect(search(db, { status: "void" }).totals).toMatchObject({ collected_usd_cents: 0 });
});

test("filtra por estado, condición y cliente", () => {
  const { jose } = seed();
  expect(numbersOf({ status: "pending" })).toEqual([3, 2]);
  expect(search(db, { status: "void" }).totals).toMatchObject({ invoices: 0, voided: 1, total_usd_cents: 0 });
  expect(numbersOf({ payment_type: "cash" })).toEqual([4, 1]);
  expect(numbersOf({ customer_id: String(jose) })).toEqual([4, 3]);
});

test("busca por número, nombre sin tildes y documento", () => {
  seed();
  expect(numbersOf({ q: "#2" })).toEqual([2]);
  expect(numbersOf({ q: "jose nunez" })).toEqual([4, 3]);
  expect(numbersOf({ q: "v-1234" })).toEqual([2]);
  expect(numbersOf({ q: "9876543" })).toEqual([4, 3]);
  expect(search(db, { q: "nadie" }).total).toBe(0);
});

test("las fechas son días en hora de Venezuela (UTC-4): una venta a las 23:30 locales cuenta en ese día", () => {
  const { first, second, third, fourth } = seed();
  setCreatedAt(db, first.id, "2026-10-29T03:30:00.000Z");
  setCreatedAt(db, second.id, "2026-10-29T04:00:00.000Z");
  setCreatedAt(db, third.id, "2026-10-30T03:59:59.999Z");
  setCreatedAt(db, fourth.id, "2026-11-05T12:00:00.000Z");
  const idsOf = (query: Parameters<typeof search>[1]) => search(db, query).items.map((item) => item.id);
  expect(idsOf({ from: "2026-10-28", to: "2026-10-28" })).toEqual([first.id]);
  expect(idsOf({ from: "2026-10-29", to: "2026-10-29" })).toEqual([third.id, second.id]);
  expect(search(db, { from: "2026-10-29" }).total).toBe(3);
  expect(idsOf({ to: "2026-10-28" })).toEqual([first.id]);
});

test("400 con detalle por parámetro inválido", () => {
  const invalid = { status: "x", payment_type: "card", customer_id: "abc", from: "2026-02-30", to: "ayer" };
  expect(errorOf(() => search(db, invalid)).details).toEqual({
    status: "Valor no permitido. Opciones: paid, pending, void",
    payment_type: "Valor no permitido. Opciones: cash, credit",
    customer_id: "Identificador inválido",
    from: "Debe ser una fecha con formato AAAA-MM-DD",
    to: "Debe ser una fecha con formato AAAA-MM-DD",
  });
  expect(errorOf(() => search(db, { from: "2026-10-30", to: "2026-10-29" })).details).toEqual({
    to: "Debe ser igual o posterior a la fecha desde",
  });
});
