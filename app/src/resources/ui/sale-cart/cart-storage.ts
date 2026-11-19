import { type Cart, type CartCustomer, type CartLine, MAX_LINE_QUANTITY, MAX_SALE_LINES } from "./cart.types";
import { emptyCart } from "./cart-lines";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseLine(value: unknown): CartLine | null {
  if (!isRecord(value)) return null;
  const { product_id, code, name, price_usd_cents, stock, quantity } = value;
  if (!isPositiveInteger(product_id) || !isPositiveInteger(quantity) || quantity > MAX_LINE_QUANTITY) return null;
  if (
    typeof name !== "string" ||
    name === "" ||
    !isNonNegativeInteger(price_usd_cents) ||
    !isNonNegativeInteger(stock)
  ) {
    return null;
  }
  return {
    product_id,
    code: typeof code === "string" && code !== "" ? code : null,
    name,
    price_usd_cents,
    stock,
    quantity,
  };
}

function parseCustomer(value: unknown): CartCustomer | null {
  if (!isRecord(value)) return null;
  const { id, name, document, balance_usd_cents } = value;
  if (!isPositiveInteger(id) || typeof name !== "string" || typeof document !== "string") return null;
  return {
    id,
    name,
    document,
    balance_usd_cents: Number.isSafeInteger(balance_usd_cents) ? Number(balance_usd_cents) : 0,
  };
}

function parseLines(entries: unknown): CartLine[] {
  const lines: CartLine[] = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    const line = parseLine(entry);
    if (line && !lines.some((existing) => existing.product_id === line.product_id)) lines.push(line);
  }
  return lines.slice(0, MAX_SALE_LINES);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Interpreta un carrito guardado (JSON); ignora líneas inválidas o repetidas y devuelve un carrito vacío si no se entiende. */
export function parseStoredCart(raw: string | null): Cart {
  if (raw === null) return emptyCart();
  const data = parseJson(raw);
  if (!isRecord(data)) return emptyCart();
  return {
    lines: parseLines(data.lines),
    customer: parseCustomer(data.customer),
    payment_type: data.payment_type === "credit" ? "credit" : "cash",
  };
}
