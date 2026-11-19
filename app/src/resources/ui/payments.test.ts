import { describe, expect, test } from "bun:test";
import { usdToBs } from "../../lib/money";
import { previewPayment, settleAmountCents } from "./payments";

describe("previewPayment", () => {
  test("abono parcial en USD: calcula los Bs y el saldo restante", () => {
    expect(previewPayment(400, "USD", 36.5, 1000)).toEqual({
      usd_cents: 400,
      bs_cents: 14600,
      remaining_usd_cents: 600,
      exceeds: false,
      settles: false,
    });
  });

  test("en Bs convierte a USD y avisa si supera el saldo", () => {
    expect(previewPayment(10000, "VES", 40, 1000)).toMatchObject({ usd_cents: 250, remaining_usd_cents: 750 });
    expect(previewPayment(50000, "VES", 40, 1000)).toMatchObject({ exceeds: true, remaining_usd_cents: 0 });
  });

  test("Saldar todo en Bs salda exacto aunque la conversión difiera en 1 centavo", () => {
    const rate = 36.5021;
    const bs = settleAmountCents(1000, "VES", rate);
    expect(bs).toBe(usdToBs(1000, rate));
    expect(previewPayment(bs, "VES", rate, 1000)).toMatchObject({ usd_cents: 1000, settles: true, exceeds: false });
    expect(previewPayment(bs + 22, "VES", rate, 1000)).toMatchObject({ usd_cents: 1000, settles: true });
  });

  test("en USD no se tolera exceder el saldo", () => {
    expect(previewPayment(1001, "USD", 36.5, 1000)).toMatchObject({ exceeds: true, settles: false });
  });
});
