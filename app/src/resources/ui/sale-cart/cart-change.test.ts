import { expect, test } from "bun:test";
import { computeChange } from "./cart-change";

const rate = 50;

test("computeChange recibido en dólares da vuelto en USD y su equivalente en Bs", () => {
  expect(computeChange(1250, 62500, 2000, "USD", rate)).toEqual({ usd_cents: 750, bs_cents: 37500 });
});

test("computeChange recibido en bolívares da vuelto en Bs y su equivalente en USD", () => {
  expect(computeChange(1250, 62500, 70000, "VES", rate)).toEqual({ usd_cents: 150, bs_cents: 7500 });
});

test("computeChange exacto no deja vuelto", () => {
  expect(computeChange(1250, 62500, 1250, "USD", rate)).toEqual({ usd_cents: 0, bs_cents: 0 });
});

test("computeChange devuelve en negativo lo que falta", () => {
  expect(computeChange(1250, 62500, 1000, "USD", rate)).toEqual({ usd_cents: -250, bs_cents: -12500 });
  expect(computeChange(1250, 62500, 60000, "VES", rate)).toEqual({ usd_cents: -50, bs_cents: -2500 });
});
