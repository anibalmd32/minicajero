import {
  type AddResult,
  type Cart,
  type CartLine,
  type CartProduct,
  MAX_LINE_QUANTITY,
  MAX_SALE_LINES,
} from "./cart.types";

/** Carrito vacío, de contado y para consumidor final. */
export function emptyCart(): Cart {
  return { lines: [], customer: null, payment_type: "cash" };
}

/** Carrito vacío y sin cliente, de contado: no hay nada que guardar. */
export function isBlankCart(cart: Cart): boolean {
  return cart.lines.length === 0 && cart.customer === null && cart.payment_type === "cash";
}

/** Línea del producto en el carrito, si está. */
export function findLine(cart: Cart, productId: number): CartLine | undefined {
  return cart.lines.find((line) => line.product_id === productId);
}

/** Unidades del producto que ya están en el carrito. */
export function quantityInCart(cart: Cart, productId: number): number {
  return findLine(cart, productId)?.quantity ?? 0;
}

/** Tope de unidades de una línea: el stock disponible (y nunca más que el máximo por línea). */
export function maxQuantity(line: Pick<CartLine, "stock">): number {
  return Math.max(0, Math.min(line.stock, MAX_LINE_QUANTITY));
}

function refreshLine(line: CartLine, product: CartProduct): void {
  line.code = product.code;
  line.name = product.name;
  line.price_usd_cents = product.price_usd_cents;
  line.stock = product.stock;
}

function newLine(product: CartProduct): CartLine {
  return {
    product_id: product.id,
    code: product.code,
    name: product.name,
    price_usd_cents: product.price_usd_cents,
    stock: product.stock,
    quantity: 1,
  };
}

/** Agrega una unidad del producto (o suma una a su línea) sin superar el stock. Actualiza los datos del producto en la línea. */
export function addProduct(cart: Cart, product: CartProduct): AddResult {
  const line = findLine(cart, product.id);
  if (product.stock <= 0) {
    if (line) refreshLine(line, product);
    return "no_stock";
  }
  if (!line) {
    if (cart.lines.length >= MAX_SALE_LINES) return "too_many_lines";
    cart.lines.push(newLine(product));
    return "added";
  }
  refreshLine(line, product);
  if (line.quantity >= maxQuantity(line)) return "max_reached";
  line.quantity += 1;
  return "added";
}

/** Agrega hasta `units` unidades respetando stock y límites; devuelve cuántas entraron y el resultado del último intento. */
export function addUnits(cart: Cart, product: CartProduct, units: number): { added: number; result: AddResult } {
  let added = 0;
  let result: AddResult = "added";
  while (added < units) {
    result = addProduct(cart, product);
    if (result !== "added") break;
    added++;
  }
  return { added, result };
}

/** Cambia la cantidad de una línea ajustándola a 1..stock. Devuelve la cantidad aplicada y si hubo que recortarla al stock. */
export function setQuantity(
  cart: Cart,
  productId: number,
  quantity: number,
): { quantity: number; capped: boolean } | null {
  const line = findLine(cart, productId);
  if (!line) return null;
  const max = Math.max(1, maxQuantity(line));
  const next = Math.min(Math.max(1, Math.trunc(quantity)), max);
  line.quantity = next;
  return { quantity: next, capped: quantity > max };
}

/** Quita la línea del producto. */
export function removeLine(cart: Cart, productId: number): void {
  cart.lines = cart.lines.filter((line) => line.product_id !== productId);
}

/** Actualiza nombre, código, precio y stock de la línea con datos frescos del producto. */
export function updateLineProduct(cart: Cart, product: CartProduct): void {
  const line = findLine(cart, product.id);
  if (line) refreshLine(line, product);
}

/** Problema de stock de una línea (sin stock o más unidades que las disponibles), o `null` si se puede vender. */
export function stockIssue(line: CartLine): string | null {
  if (line.stock <= 0) return "Sin stock: quítalo de la venta.";
  if (line.quantity > line.stock) {
    return `Solo ${line.stock === 1 ? "queda 1 disponible" : `quedan ${line.stock} disponibles`}: ajusta la cantidad.`;
  }
  return null;
}
