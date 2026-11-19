import { expect, test } from "bun:test";
import { usdToBs } from "../../lib/money";
import { calculateSaleSnapshot } from "./invoices.service";

test("Bs de la línea = round(línea_usd × tasa), no precio unitario Bs redondeado × cantidad", () => {
  const snapshot = calculateSaleSnapshot(
    [{ product_id: 1, product_name: "Caramelo", unit_price_usd_cents: 1, quantity: 10 }],
    36.15,
    0,
  );
  expect(snapshot.items[0]).toMatchObject({
    unit_price_bs_cents: 36,
    line_total_usd_cents: 10,
    line_total_bs_cents: 362,
  });
  expect(snapshot.items[0]?.line_total_bs_cents).not.toBe(36 * 10);
});

test("subtotal Bs = suma de las líneas Bs (puede diferir de convertir el subtotal USD)", () => {
  const snapshot = calculateSaleSnapshot(
    [
      { product_id: 1, product_name: "A", unit_price_usd_cents: 1, quantity: 1 },
      { product_id: 2, product_name: "B", unit_price_usd_cents: 1, quantity: 1 },
    ],
    36.5,
    0,
  );
  expect(snapshot.items.map((item) => item.line_total_bs_cents)).toEqual([37, 37]);
  expect(snapshot.subtotal_usd_cents).toBe(2);
  expect(snapshot.subtotal_bs_cents).toBe(74);
  expect(usdToBs(2, 36.5)).toBe(73);
});

test("IVA en cada moneda = round(subtotal × iva%) y total = subtotal + IVA", () => {
  const snapshot = calculateSaleSnapshot(
    [
      { product_id: 1, product_name: "A", unit_price_usd_cents: 1005, quantity: 1 },
      { product_id: 2, product_name: "B", unit_price_usd_cents: 1, quantity: 1 },
      { product_id: 3, product_name: "C", unit_price_usd_cents: 1, quantity: 1 },
    ],
    36.5,
    16,
  );
  expect(snapshot).toMatchObject({
    rate: 36.5,
    tax_percent: 16,
    subtotal_usd_cents: 1007,
    tax_usd_cents: 161,
    total_usd_cents: 1168,
    subtotal_bs_cents: 36_683 + 37 + 37,
    tax_bs_cents: 5881,
    total_bs_cents: 36_757 + 5881,
  });
});

test("venta de productos a precio 0", () => {
  const snapshot = calculateSaleSnapshot(
    [{ product_id: 1, product_name: "Bolsa", unit_price_usd_cents: 0, quantity: 3 }],
    40,
    16,
  );
  expect(snapshot).toMatchObject({ subtotal_usd_cents: 0, total_usd_cents: 0, total_bs_cents: 0 });
});
