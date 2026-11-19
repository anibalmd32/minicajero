import { expect, test } from "bun:test";
import { BadRequestError } from "../../lib/http-errors";
import { updateSettings } from "../settings/settings.service";
import { searchProducts } from "./products.service";
import { create, db, search, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("filtros active, low_stock y paginación", () => {
  create({ name: "A", price_usd: 1, stock: 2 });
  create({ name: "B", price_usd: 1, stock: 5 });
  create({ name: "C", price_usd: 1, stock: 6 });
  create({ name: "D", price_usd: 1, stock: 0, active: false });
  const names = (query: Parameters<typeof search>[0]) => search(query).items.map((p) => p.name);
  expect(names({ active: "1" })).toEqual(["A", "B", "C"]);
  expect(names({ active: "0" })).toEqual(["D"]);
  expect(names({ low_stock: "1" })).toEqual(["A", "B", "D"]);
  expect(names({ low_stock: "1", active: "true" })).toEqual(["A", "B"]);
  expect(names({ out_of_stock: "1" })).toEqual(["D"]);
  expect(names({ out_of_stock: "1", active: "1" })).toEqual([]);
  expect(names({ out_of_stock: "1", low_stock: "1" })).toEqual(["D"]);
  expect(search().low_stock_threshold).toBe(5);
  updateSettings({ low_stock_threshold: 2 }, db());
  expect(names({ low_stock: "1" })).toEqual(["A", "D"]);
  expect(search({ q: "c" }).items[0]?.low_stock).toBe(false);
  const second = searchProducts(
    { q: null, active: null, low_stock: null, out_of_stock: null },
    { limit: 2, offset: 2 },
    db(),
  );
  expect(second.total).toBe(4);
  expect(second.items.map((p) => p.name)).toEqual(["C", "D"]);
});

test("rechaza parámetros inválidos", () => {
  expect(() => search({ active: "si" })).toThrow(BadRequestError);
  expect(() => search({ low_stock: "2" })).toThrow(BadRequestError);
  expect(() => search({ out_of_stock: "x" })).toThrow(BadRequestError);
  expect(() => search({ q: "x".repeat(101) })).toThrow(BadRequestError);
});
