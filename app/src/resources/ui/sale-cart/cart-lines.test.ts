import { expect, test } from "bun:test";
import { arroz, firstLine, harina } from "./cart.test-support";
import {
  addProduct,
  addUnits,
  emptyCart,
  isBlankCart,
  quantityInCart,
  removeLine,
  setQuantity,
  stockIssue,
  updateLineProduct,
} from "./cart-lines";
import { toSaleInput } from "./cart-totals";

test("addProduct agrega una línea y suma unidades hasta el stock", () => {
  const cart = emptyCart();
  expect(addProduct(cart, harina)).toBe("added");
  expect(addProduct(cart, harina)).toBe("added");
  expect(addProduct(cart, harina)).toBe("added");
  expect(addProduct(cart, harina)).toBe("max_reached");
  expect(quantityInCart(cart, 1)).toBe(3);
  expect(cart.lines).toHaveLength(1);
});

test("addProduct no agrega productos sin stock", () => {
  const cart = emptyCart();
  expect(addProduct(cart, { ...harina, stock: 0 })).toBe("no_stock");
  expect(cart.lines).toHaveLength(0);
});

test("addProduct refresca precio y stock de la línea con los datos nuevos", () => {
  const cart = emptyCart();
  addProduct(cart, harina);
  addProduct(cart, { ...harina, price_usd_cents: 150, stock: 8 });
  expect(cart.lines[0]).toMatchObject({ price_usd_cents: 150, stock: 8, quantity: 2 });
});

test("setQuantity ajusta al rango 1..stock y avisa si recortó", () => {
  const cart = emptyCart();
  addProduct(cart, harina);
  expect(setQuantity(cart, 1, 5)).toEqual({ quantity: 3, capped: true });
  expect(setQuantity(cart, 1, 0)).toEqual({ quantity: 1, capped: false });
  expect(setQuantity(cart, 1, 2)).toEqual({ quantity: 2, capped: false });
  expect(setQuantity(cart, 99, 2)).toBeNull();
});

test("stockIssue detecta líneas sin stock o por encima del disponible", () => {
  const cart = emptyCart();
  addProduct(cart, arroz);
  setQuantity(cart, 2, 4);
  expect(stockIssue(firstLine(cart))).toBeNull();
  updateLineProduct(cart, { ...arroz, stock: 1 });
  expect(stockIssue(firstLine(cart))).toContain("queda 1 disponible");
  updateLineProduct(cart, { ...arroz, stock: 0 });
  expect(stockIssue(firstLine(cart))).toContain("Sin stock");
});

test("toSaleInput, removeLine e isBlankCart arman el cuerpo de la venta", () => {
  const cart = emptyCart();
  expect(isBlankCart(cart)).toBe(true);
  addProduct(cart, harina);
  addProduct(cart, arroz);
  removeLine(cart, 1);
  expect(toSaleInput(cart, 36.5, 16)).toEqual({
    payment_type: "cash",
    customer_id: null,
    items: [{ product_id: 2, quantity: 1, unit_price_usd_cents: 333 }],
    expected_rate: 36.5,
    expected_tax_percent: 16,
  });
  expect(isBlankCart(cart)).toBe(false);
});

test("addUnits agrega todas las unidades si hay stock", () => {
  const cart = emptyCart();
  expect(addUnits(cart, arroz, 4)).toEqual({ added: 4, result: "added" });
  expect(quantityInCart(cart, arroz.id)).toBe(4);
});

test("addUnits se detiene en el stock disponible", () => {
  const cart = emptyCart();
  expect(addUnits(cart, harina, 5)).toEqual({ added: 3, result: "max_reached" });
  expect(quantityInCart(cart, harina.id)).toBe(3);
});
