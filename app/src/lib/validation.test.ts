import { expect, test } from "bun:test";
import { detailsOf } from "../test-support/details-of";
import { countDecimals, Validator } from "./validation";

test("datos válidos", () => {
  const v = new Validator({ nombre: "  Ana  ", stock: 3, precio: 10.5, tipo: "V", activo: true, tel: "" });
  expect(v.requiredString("nombre", { max: 10 })).toBe("Ana");
  expect(v.optionalString("tel")).toBeNull();
  expect(v.integer("stock", { min: 0 })).toBe(3);
  expect(v.integer("falta", { optional: true })).toBeNull();
  expect(v.nonNegativeNumber("precio", { maxDecimals: 2 })).toBe(10.5);
  expect(v.oneOf("tipo", ["V", "E", "J"])).toBe("V");
  expect(v.boolean("activo")).toBe(true);
  expect(() => v.assertValid()).not.toThrow();
});

test("acumula errores por campo", () => {
  const v = new Validator({ nombre: "   ", stock: 1.5, neg: -1, precio: 1.234, tipo: "X", activo: "si", texto: 5 });
  v.requiredString("nombre");
  v.integer("stock");
  v.integer("neg", { min: 0 });
  v.nonNegativeNumber("precio", { maxDecimals: 2 });
  v.oneOf("tipo", ["V", "E", "J"]);
  v.boolean("activo");
  v.requiredString("texto");
  v.nonNegativeNumber("ausente");
  expect(detailsOf(() => v.assertValid())).toEqual({
    nombre: "Este campo es obligatorio",
    stock: "Debe ser un número entero",
    neg: "Debe ser mayor o igual que 0",
    precio: "Admite como máximo 2 decimales",
    tipo: "Valor no permitido. Opciones: V, E, J",
    activo: "Debe ser verdadero o falso",
    texto: "Debe ser un texto",
    ausente: "Este campo es obligatorio",
  });
});

test("nonNegativeNumber rechaza negativos y no numéricos", () => {
  const v = new Validator({ a: -0.01, b: "10", c: Number.NaN });
  v.nonNegativeNumber("a");
  v.nonNegativeNumber("b");
  v.nonNegativeNumber("c");
  expect(Object.keys(detailsOf(() => v.assertValid()) ?? {})).toEqual(["a", "b", "c"]);
});

test("límites de rango con formato es-VE", () => {
  const v = new Validator({ bajo: 0, alto: 1_000_000_001 });
  v.nonNegativeNumber("bajo", { min: 0.0001 });
  v.nonNegativeNumber("alto", { max: 1_000_000_000 });
  expect(detailsOf(() => v.assertValid())).toEqual({
    bajo: "Debe ser mayor o igual que 0,0001",
    alto: "Debe ser menor o igual que 1.000.000.000",
  });
});

test("longitudes y patrón", () => {
  const v = new Validator({ a: "abcdef", b: "12a" });
  v.requiredString("a", { max: 5 });
  v.requiredString("b", { pattern: /^\d+$/, patternMessage: "Solo dígitos" });
  expect(detailsOf(() => v.assertValid())).toEqual({
    a: "Debe tener como máximo 5 caracteres",
    b: "Solo dígitos",
  });
});

test("countDecimals", () => {
  expect(countDecimals(10)).toBe(0);
  expect(countDecimals(10.5)).toBe(1);
  expect(countDecimals(0.1 + 0.2)).toBe(1);
  expect(countDecimals(36.1234)).toBe(4);
  expect(countDecimals(1e-7)).toBe(7);
});
