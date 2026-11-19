import { isJsonObject, type JsonObject } from "../../lib/request";
import { Validator } from "../../lib/validation";
import { countFormat, productKey, units } from "./invoice-format";
import { PAYMENT_TYPES } from "./invoices.types";
import type { SaleLine, SaleRequest } from "./sale.types";

/** Máximo de líneas por factura. */
export const MAX_SALE_LINES = 200;
/** Máximo de unidades de un producto en una factura. */
export const MAX_LINE_QUANTITY = 1_000_000;

const NOTES_MAX_LENGTH = 500;
export const SALE_ERROR_MESSAGE = "Revisa los datos de la venta";

function readLineInteger(v: Validator, entry: JsonObject, index: number, field: string, max: number): number | null {
  const value = entry[field];
  const key = `items[${index}].${field}`;
  if (value === undefined || value === null || value === "") {
    v.addError(key, "Este campo es obligatorio");
    return null;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    v.addError(key, "Debe ser un número entero");
    return null;
  }
  if (value < 1 || value > max) {
    v.addError(key, `Debe ser un entero entre 1 y ${countFormat.format(max)}`);
    return null;
  }
  return value;
}

function readExpectedPrice(v: Validator, entry: JsonObject, index: number): number | null {
  const value = entry.unit_price_usd_cents;
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    v.addError(`items[${index}].unit_price_usd_cents`, "Debe ser un entero mayor o igual que 0");
    return null;
  }
  return value;
}

function readLine(v: Validator, entry: unknown, index: number): SaleLine | null {
  if (!isJsonObject(entry)) {
    v.addError(`items[${index}]`, "Cada línea debe indicar product_id y quantity");
    return null;
  }
  const productId = readLineInteger(v, entry, index, "product_id", Number.MAX_SAFE_INTEGER);
  const quantity = readLineInteger(v, entry, index, "quantity", MAX_LINE_QUANTITY);
  const expectedPrice = readExpectedPrice(v, entry, index);
  if (productId === null || quantity === null) return null;
  const line: SaleLine = { product_id: productId, quantity };
  if (expectedPrice !== null) line.expected_price_usd_cents = expectedPrice;
  return line;
}

function readItems(v: Validator, raw: unknown): SaleLine[] {
  if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) {
    v.addError("items", "Agrega al menos un producto");
    return [];
  }
  if (!Array.isArray(raw)) {
    v.addError("items", "Debe ser una lista de productos");
    return [];
  }
  if (raw.length > MAX_SALE_LINES) {
    v.addError("items", `Como máximo ${MAX_SALE_LINES} líneas por venta`);
    return [];
  }
  const lines: SaleLine[] = [];
  raw.forEach((entry: unknown, index) => {
    const line = readLine(v, entry, index);
    if (line !== null) lines.push(line);
  });
  return lines;
}

/**
 * Une las líneas repetidas de un mismo producto sumando sus cantidades, conservando el orden de la primera aparición
 * y el primer precio esperado que se haya indicado.
 */
export function groupSaleLines(lines: readonly SaleLine[]): SaleLine[] {
  const grouped = new Map<number, SaleLine>();
  for (const line of lines) {
    const current = grouped.get(line.product_id);
    if (!current) {
      grouped.set(line.product_id, { ...line });
      continue;
    }
    current.quantity += line.quantity;
    if (current.expected_price_usd_cents === undefined && line.expected_price_usd_cents !== undefined) {
      current.expected_price_usd_cents = line.expected_price_usd_cents;
    }
  }
  return [...grouped.values()];
}

/**
 * Valida el cuerpo de una venta: `payment_type` (`cash` contado o `credit` fiado), `items` con `product_id`
 * y `quantity` enteros (> 0), `customer_id` opcional salvo en fiado y `notes` opcional. Agrupa productos repetidos.
 * Opcionalmente recibe lo que vio el operador al confirmar: `items[].unit_price_usd_cents`, `expected_rate` y
 * `expected_tax_percent`. Lanza 400 con detalle por campo (`items[0].quantity`, `customer_id`...).
 */
export function validateSale(body: JsonObject): SaleRequest {
  const v = new Validator(body);
  const payment_type = v.oneOf("payment_type", PAYMENT_TYPES);
  const customer_id = v.integer("customer_id", { optional: true, min: 1 });
  const notes = v.optionalString("notes", { max: NOTES_MAX_LENGTH });
  const expected_rate = v.nonNegativeNumber("expected_rate", { optional: true });
  const expected_tax_percent = v.nonNegativeNumber("expected_tax_percent", { optional: true });
  const lines = groupSaleLines(readItems(v, body.items));
  if (payment_type === "credit" && !v.has("customer_id")) {
    v.addError("customer_id", "Para vender fiado debes indicar el cliente");
  }
  for (const line of lines) {
    if (line.quantity > MAX_LINE_QUANTITY) {
      v.addError(productKey(line.product_id), `Como máximo ${units(MAX_LINE_QUANTITY)} por producto`);
    }
  }
  v.assertValid(SALE_ERROR_MESSAGE);
  return { customer_id, payment_type, lines, notes, expected_rate, expected_tax_percent };
}
