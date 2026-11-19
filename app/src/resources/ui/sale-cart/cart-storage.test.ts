import { expect, test } from "bun:test";
import { harina } from "./cart.test-support";
import { addProduct, emptyCart } from "./cart-lines";
import { parseStoredCart } from "./cart-storage";

test("parseStoredCart hace ida y vuelta por JSON", () => {
  const cart = emptyCart();
  addProduct(cart, harina);
  cart.customer = { id: 4, name: "María Pérez", document: "V-123", balance_usd_cents: 0 };
  cart.payment_type = "credit";
  expect(parseStoredCart(JSON.stringify(cart))).toEqual(cart);
});

test("parseStoredCart descarta datos corruptos, líneas inválidas y repetidas", () => {
  expect(parseStoredCart("{no es json")).toEqual(emptyCart());
  expect(parseStoredCart(null)).toEqual(emptyCart());
  const raw = JSON.stringify({
    lines: [
      { product_id: 1, code: "A", name: "A", price_usd_cents: 100, stock: 2, quantity: 1 },
      { product_id: 1, code: "A", name: "A", price_usd_cents: 100, stock: 2, quantity: 2 },
      { product_id: 2, name: "B", price_usd_cents: 100, stock: 2, quantity: 1.5 },
      { product_id: "3", name: "C", price_usd_cents: 100, stock: 2, quantity: 1 },
    ],
    customer: { id: "x" },
    payment_type: "otro",
  });
  const cart = parseStoredCart(raw);
  expect(cart.lines.map((line) => [line.product_id, line.quantity])).toEqual([[1, 1]]);
  expect(cart.customer).toBeNull();
  expect(cart.payment_type).toBe("cash");
});
