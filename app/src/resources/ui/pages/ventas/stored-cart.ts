import { type Cart, emptyCart, isBlankCart, parseStoredCart } from "../../sale-cart";
import { CART_STORAGE_KEY } from "./constants";

export function readStoredCart(): Cart {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return emptyCart();
  }
}

export function writeStoredCart(cart: Cart): void {
  try {
    if (isBlankCart(cart)) window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    return;
  }
}
