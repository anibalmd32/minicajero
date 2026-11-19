import { expect, test } from "bun:test";
import { BadRequestError } from "../../lib/http-errors";
import { validatePayment } from "./payments.service";
import { errorOf } from "./payments.test-support";

test("acepta USD y Bs con hasta 2 decimales y convierte a centavos", () => {
  expect(validatePayment({ amount: 10.5, currency: "USD" })).toEqual({
    amount_cents: 1050,
    currency: "USD",
    notes: null,
    expected_rate: null,
  });
  expect(validatePayment({ amount: 365.03, currency: "VES", notes: "  pago  móvil " }).notes).toBe("pago móvil");
});

test("rechaza monto cero, negativo, con 3 decimales o moneda inválida", () => {
  for (const body of [
    { amount: 0, currency: "USD" },
    { amount: -1, currency: "USD" },
    { amount: 1.005, currency: "USD" },
    { amount: "10", currency: "USD" },
  ]) {
    const err = errorOf(() => validatePayment(body));
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.details?.amount).toBeDefined();
  }
  expect(errorOf(() => validatePayment({ amount: 1, currency: "EUR" })).details?.currency).toBeDefined();
});
