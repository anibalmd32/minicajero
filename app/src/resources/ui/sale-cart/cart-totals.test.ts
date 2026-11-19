import { expect, test } from "bun:test";
import { calculateSaleSnapshot } from "../../../modules/invoices/invoices.service";
import { arroz, harina } from "./cart.test-support";
import { addProduct, emptyCart, setQuantity } from "./cart-lines";
import { computeTotals } from "./cart-totals";

test("computeTotals coincide con el snapshot que calcula el servidor", () => {
  const cart = emptyCart();
  addProduct(cart, harina);
  addProduct(cart, arroz);
  setQuantity(cart, 1, 3);
  setQuantity(cart, 2, 7);
  const rate = 36.5025;
  const tax = 16;
  const totals = computeTotals(cart.lines, rate, tax);
  const snapshot = calculateSaleSnapshot(
    cart.lines.map((line) => ({
      product_id: line.product_id,
      product_name: line.name,
      unit_price_usd_cents: line.price_usd_cents,
      quantity: line.quantity,
    })),
    rate,
    tax,
  );
  expect(totals).toEqual({
    units: 10,
    subtotal_usd_cents: snapshot.subtotal_usd_cents,
    tax_usd_cents: snapshot.tax_usd_cents,
    total_usd_cents: snapshot.total_usd_cents,
    subtotal_bs_cents: snapshot.subtotal_bs_cents,
    tax_bs_cents: snapshot.tax_bs_cents,
    total_bs_cents: snapshot.total_bs_cents,
  });
});

test("computeTotals sin tasa deja los Bs en null", () => {
  const cart = emptyCart();
  addProduct(cart, harina);
  expect(computeTotals(cart.lines, null, 0)).toMatchObject({ total_usd_cents: 125, total_bs_cents: null });
});
