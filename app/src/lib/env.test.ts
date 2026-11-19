import { describe, expect, test } from "bun:test";
import { DEFAULT_PORT, readPort } from "./env";

describe("readPort", () => {
  test("sin valor usa el puerto por defecto", () => {
    expect(readPort(undefined)).toBe(DEFAULT_PORT);
    expect(readPort("")).toBe(DEFAULT_PORT);
    expect(readPort("   ")).toBe(DEFAULT_PORT);
  });
  test("acepta enteros decimales en rango, ignorando espacios alrededor", () => {
    expect(readPort("4102")).toBe(4102);
    expect(readPort(" 4102 ")).toBe(4102);
    expect(readPort("1")).toBe(1);
    expect(readPort("65535")).toBe(65535);
  });
  test("rechaza formatos que no son un entero decimal", () => {
    for (const raw of ["0x10", "1e3", "4102.0", "4.5", "-1", "+80", "abc", "40 00"]) {
      expect(() => readPort(raw)).toThrow(/PORT inválida/);
    }
  });
  test("rechaza puertos fuera de 1-65535", () => {
    expect(() => readPort("0")).toThrow(/PORT inválida/);
    expect(() => readPort("65536")).toThrow(/PORT inválida/);
    expect(() => readPort("99999")).toThrow(/PORT inválida/);
  });
});
