import { expect, test } from "bun:test";
import { bsToUsd, fromCents, normalizeRate, percentOf, roundTo, toCents, usdToBs } from "./money";

test("convierte sin ruido de coma flotante", () => {
  expect(toCents(10.5)).toBe(1050);
  expect(toCents(1.005)).toBe(101);
  expect(toCents(0.1 + 0.2)).toBe(30);
  expect(toCents(19.99)).toBe(1999);
  expect(toCents(-1.005)).toBe(-101);
  expect(toCents(0)).toBe(0);
  expect(toCents(1e-7)).toBe(0);
});
test("ida y vuelta", () => {
  expect(fromCents(1050)).toBe(10.5);
  expect(fromCents(toCents(123456.78))).toBe(123456.78);
});
test("rechaza valores inválidos", () => {
  expect(() => toCents(Number.NaN)).toThrow(RangeError);
  expect(() => fromCents(10.5)).toThrow(RangeError);
});

test("redondea half away from zero", () => {
  expect(roundTo(1.005, 2)).toBe(1.01);
  expect(roundTo(-2.5, 0)).toBe(-3);
  expect(roundTo(36.12345, 4)).toBe(36.1235);
});
test("tasa a 4 decimales y > 0", () => {
  expect(normalizeRate(36.123456)).toBe(36.1235);
  expect(() => normalizeRate(0)).toThrow(RangeError);
  expect(() => normalizeRate(0.00001)).toThrow(RangeError);
  expect(() => normalizeRate(-5)).toThrow(RangeError);
});

test("usdToBs: $10,00 x 888,891 = Bs 8.888,91", () => {
  expect(usdToBs(1000, 888.891)).toBe(888891);
});
test("usdToBs redondea al céntimo: $0,01 x 36,125 = Bs 0,36125 -> 0,36", () => {
  expect(usdToBs(1, 36.125)).toBe(36);
});
test("usdToBs redondea al céntimo: $0,03 x 36,15 = Bs 1,0845 -> 1,08", () => {
  expect(usdToBs(3, 36.15)).toBe(108);
});
test("usdToBs con medio céntimo exacto se aleja de cero: $0,02 x 0,25 = Bs 0,005 -> 0,01", () => {
  expect(usdToBs(2, 0.25)).toBe(1);
  expect(usdToBs(-2, 0.25)).toBe(-1);
});
test("usdToBs de $0 es Bs 0", () => {
  expect(usdToBs(0, 50)).toBe(0);
});
test("bsToUsd: Bs 8.888,91 / 888,891 = $10,00", () => {
  expect(bsToUsd(888891, 888.891)).toBe(1000);
});
test("bsToUsd redondea al centavo: Bs 100 / 36,5 = $2,7397 -> 2,74", () => {
  expect(bsToUsd(10000, 36.5)).toBe(274);
});
test("montos grandes sin pérdida", () => {
  expect(usdToBs(10_000_000_000, 1234.5678)).toBe(12_345_678_000_000);
});
test("rechaza entradas inválidas", () => {
  expect(() => usdToBs(10.5, 36)).toThrow(RangeError);
  expect(() => usdToBs(100, 0)).toThrow(RangeError);
});

test("16 % de $10,05 = 160,8 centavos -> 161", () => {
  expect(percentOf(1005, 16)).toBe(161);
});
test("medio centavo exacto se aleja de cero: 10 % de 5 = 0,5 -> 1", () => {
  expect(percentOf(5, 10)).toBe(1);
});
test("porcentaje con decimales sin ruido binario: 16,25 % de 10000 = 1625", () => {
  expect(percentOf(10_000, 16.25)).toBe(1625);
});
test("0 % y 100 %", () => {
  expect(percentOf(12_345, 0)).toBe(0);
  expect(percentOf(12_345, 100)).toBe(12_345);
});
test("rechaza entradas inválidas", () => {
  expect(() => percentOf(1.5, 16)).toThrow(RangeError);
  expect(() => percentOf(100, -1)).toThrow(RangeError);
  expect(() => percentOf(100, Number.NaN)).toThrow(RangeError);
});
