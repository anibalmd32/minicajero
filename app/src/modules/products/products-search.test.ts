import { expect, test } from "bun:test";
import { updateProduct } from "./products.service";
import { create, db, search, useProductsDatabase } from "./products.test-support";

useProductsDatabase();

test("búsqueda por nombre o código sin tildes, código exacto primero", () => {
  create({ name: "Café molido", code: "CAF-1", price_usd: 3 });
  create({ name: "Azúcar", code: "AZ-1", price_usd: 1 });
  create({ name: "Arroz", code: "7591234", price_usd: 1 });
  create({ name: "Galletas 7591234 pack", price_usd: 1 });
  const names = (q: string) => search({ q }).items.map((p) => p.name);
  expect(names("cafe")).toEqual(["Café molido"]);
  expect(names("AZUCAR")).toEqual(["Azúcar"]);
  expect(names("caf-1")).toEqual(["Café molido"]);
  expect(names("7591234")).toEqual(["Arroz", "Galletas 7591234 pack"]);
  expect(names("galletas pack")).toEqual(["Galletas 7591234 pack"]);
  expect(names("%")).toEqual([]);
  expect(search().total).toBe(4);
});

test("búsqueda insensible a tildes y mayúsculas en ambos sentidos, también tras editar", () => {
  const pina = create({ name: "Jugo de Piña", code: "jp-01", price_usd: 2 });
  create({ name: "PIÑATA grande", price_usd: 5 });
  create({ name: "Pino", price_usd: 1 });
  const names = (q: string) => search({ q }).items.map((p) => p.name);
  expect(names("pina")).toEqual(["Jugo de Piña", "PIÑATA grande"]);
  expect(names("PIÑA")).toEqual(["Jugo de Piña", "PIÑATA grande"]);
  expect(names("jugo pina")).toEqual(["Jugo de Piña"]);
  expect(names("pina jp-01")).toEqual(["Jugo de Piña"]);
  expect(names("JP-01")).toEqual(["Jugo de Piña"]);
  updateProduct(pina.id, { name: "Néctar de Guanábana", code: "NG-1", price_usd: 2 }, db());
  expect(names("nectar guanabana")).toEqual(["Néctar de Guanábana"]);
  expect(names("ng-1")).toEqual(["Néctar de Guanábana"]);
  expect(names("jp-01")).toEqual([]);
  expect(names("pina")).toEqual(["PIÑATA grande"]);
});

test("la búsqueda por texto usa search_text, no name_key ni el código", () => {
  create({ name: "Jugo de Piña", code: "JP-01", price_usd: 2 });
  db().run("UPDATE products SET name_key = '', code = NULL");
  expect(search({ q: "pina jp-01" }).items.map((p) => p.name)).toEqual(["Jugo de Piña"]);
  db().run("UPDATE products SET search_text = ''");
  expect(search({ q: "pina" }).total).toBe(0);
});

test("código exacto primero aunque se escriba en minúsculas", () => {
  create({ name: "Aceite", code: "ABC-0011", price_usd: 1 });
  create({ name: "Zanahoria", code: "ABC-001", price_usd: 1 });
  const codes = (q: string) => search({ q }).items.map((p) => p.code);
  expect(codes("ABC-001")).toEqual(["ABC-001", "ABC-0011"]);
  expect(codes("abc-001")).toEqual(["ABC-001", "ABC-0011"]);
});

test("%, _ y \\ se buscan como texto literal", () => {
  create({ name: "Descuento 50% leche", price_usd: 1 });
  create({ name: "Jugo_naranja", price_usd: 1 });
  create({ name: "Jugo de naranja", price_usd: 1 });
  create({ name: "Caja AB", code: "AB-1", price_usd: 1 });
  const names = (q: string) => search({ q }).items.map((p) => p.name);
  expect(names("50%")).toEqual(["Descuento 50% leche"]);
  expect(names("jugo_n")).toEqual(["Jugo_naranja"]);
  expect(names("a\\b")).toEqual([]);
});
