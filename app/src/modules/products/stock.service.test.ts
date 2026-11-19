import { expect, test } from "bun:test";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { adjustStock, getProduct, getStockMovements } from "./products.service";
import { create, db, errorOf, harina, page, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("delta y set con historial", () => {
  const product = create(harina);
  expect(adjustStock(product.id, { delta: 5, reason: " Compra   proveedor " }, db()).stock).toBe(15);
  expect(adjustStock(product.id, { delta: -3 }, db()).stock).toBe(12);
  expect(adjustStock(product.id, { set: 4, reason: "Conteo" }, db())).toMatchObject({ stock: 4, low_stock: true });
  expect(adjustStock(product.id, { set: 4 }, db()).stock).toBe(4);
  const history = getStockMovements(product.id, page, db());
  expect(history.total).toBe(4);
  expect(history.items.map((m) => [m.delta, m.stock_after, m.reason])).toEqual([
    [-8, 4, "Conteo"],
    [-3, 12, null],
    [5, 15, "Compra proveedor"],
    [10, 10, "Stock inicial"],
  ]);
});

test("no deja el stock negativo: 409 claro", () => {
  const product = create(harina);
  const err = errorOf(() => adjustStock(product.id, { delta: -11 }, db()));
  expect(err).toBeInstanceOf(ConflictError);
  expect(err.message).toBe("Stock insuficiente: hay 10 unidades y se intentan retirar 11 unidades");
  expect(getProduct(product.id, db()).stock).toBe(10);
  expect(adjustStock(product.id, { delta: -10 }, db()).stock).toBe(0);
});

test("valida el cuerpo del ajuste", () => {
  const product = create(harina);
  const invalid: JsonObject[] = [
    {},
    { delta: 1, set: 2 },
    { delta: 0 },
    { delta: 1.5 },
    { set: -1 },
    { set: "3" },
    { delta: 1, reason: "x".repeat(201) },
  ];
  for (const body of invalid)
    expect(errorOf(() => adjustStock(product.id, body, db()))).toBeInstanceOf(BadRequestError);
  expect(errorOf(() => adjustStock(product.id, { delta: 1_000_000_000 }, db())).details?.delta).toContain("superar");
  expect(() => adjustStock(999, { delta: 1 }, db())).toThrow(NotFoundError);
  expect(() => getStockMovements(999, page, db())).toThrow(NotFoundError);
});
