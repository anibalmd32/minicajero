import type { Cart, CartLine, CartProduct } from "./cart.types";

export const harina: CartProduct = { id: 1, code: "HAR-001", name: "Harina", price_usd_cents: 125, stock: 3 };
export const arroz: CartProduct = { id: 2, code: null, name: "Arroz", price_usd_cents: 333, stock: 10 };

export function firstLine(cart: Cart): CartLine {
  const line = cart.lines[0];
  if (!line) throw new Error("El carrito no tiene líneas");
  return line;
}
