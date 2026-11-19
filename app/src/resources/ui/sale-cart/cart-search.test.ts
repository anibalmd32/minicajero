import { expect, test } from "bun:test";
import { harina } from "./cart.test-support";
import { parseQuantityPrefix, pickProductForEnter } from "./cart-search";

const aceite = { id: 3, code: "7591083000019", name: "Aceite", stock: 0 };
const atun = { id: 4, code: "7702011101011", name: "Atún en aceite", stock: 30 };
const pan = { id: 5, code: null, name: "Pan", stock: 25 };

test("pickProductForEnter prefiere el código exacto sin distinguir mayúsculas", () => {
  const products = [{ ...harina }, { id: 6, code: "har-002", name: "Harina integral", stock: 4 }];
  expect(pickProductForEnter(products, "HAR-002")?.id).toBe(6);
});

test("pickProductForEnter sin código exacto devuelve el primero aunque no esté disponible", () => {
  expect(pickProductForEnter([aceite, atun], "aceite")?.id).toBe(3);
});

test("pickProductForEnter ignora productos sin código al buscar coincidencia exacta", () => {
  expect(pickProductForEnter([pan, atun], "7702011101011")?.id).toBe(4);
});

test("pickProductForEnter sin resultados no elige nada", () => {
  expect(pickProductForEnter([], "aceite")).toBeUndefined();
});

test("parseQuantityPrefix sin prefijo pide una unidad", () => {
  expect(parseQuantityPrefix("  harina ")).toEqual({ quantity: 1, query: "harina" });
});

test("parseQuantityPrefix lee la cantidad antes del asterisco", () => {
  expect(parseQuantityPrefix("3*7591002000011")).toEqual({ quantity: 3, query: "7591002000011" });
  expect(parseQuantityPrefix("12 * harina pan")).toEqual({ quantity: 12, query: "harina pan" });
});

test("parseQuantityPrefix trata cero como una unidad y sin búsqueda queda vacía", () => {
  expect(parseQuantityPrefix("0*harina")).toEqual({ quantity: 1, query: "harina" });
  expect(parseQuantityPrefix("4*")).toEqual({ quantity: 4, query: "" });
});

test("parseQuantityPrefix no toma como prefijo un asterisco dentro del texto", () => {
  expect(parseQuantityPrefix("pan*dulce")).toEqual({ quantity: 1, query: "pan*dulce" });
});
