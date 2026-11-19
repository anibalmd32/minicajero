import { AMOUNT_DECIMALS, PRODUCT_PRICE_MAX_USD, toCents } from "../../lib/money";
import { PRODUCT_CODE_MAX_LENGTH, PRODUCT_CODE_PATTERN } from "../../lib/product-code";
import type { JsonObject } from "../../lib/request";
import { collapseSpaces } from "../../lib/text";
import { Validator } from "../../lib/validation";
import { type ProductData, type ProductRow, STOCK_MAX } from "./products.types";

const NAME_MAX_LENGTH = 120;
const NAME_PATTERN = /[\p{L}\d]/u;
const INVALID_PRODUCT_MESSAGE = "Revisa los datos del producto";

function readCode(v: Validator): string | null {
  const code = v.optionalString("code", {
    max: PRODUCT_CODE_MAX_LENGTH,
    pattern: PRODUCT_CODE_PATTERN,
    patternMessage: "Solo letras sin tildes, números y símbolos. Ejemplo: ABC-001",
  });
  return code === null ? null : code.toUpperCase();
}

function readName(v: Validator): string {
  const name = v.requiredString("name", {
    max: NAME_MAX_LENGTH,
    pattern: NAME_PATTERN,
    patternMessage: "Debe contener letras o números",
  });
  return collapseSpaces(name);
}

function readPriceCents(v: Validator): number {
  return toCents(v.nonNegativeNumber("price_usd", { max: PRODUCT_PRICE_MAX_USD, maxDecimals: AMOUNT_DECIMALS }));
}

/**
 * Valida los datos de un producto nuevo. `price_usd` llega en USD decimal (hasta 2 decimales) y se convierte a centavos;
 * el código se guarda en mayúsculas; `stock` (entero >= 0) y `active` son opcionales (0 y `true` por defecto).
 */
export function validateNewProduct(body: JsonObject): { data: ProductData; stock: number } {
  const v = new Validator(body);
  const code = readCode(v);
  const name = readName(v);
  const price_usd_cents = readPriceCents(v);
  const stock = v.integer("stock", { optional: true, min: 0, max: STOCK_MAX }) ?? 0;
  const active = v.boolean("active", { optional: true }) ?? true;
  v.assertValid(INVALID_PRODUCT_MESSAGE);
  return { data: { code, name, price_usd_cents, active }, stock };
}

/**
 * Valida los datos editables de un producto existente. `code` y `active` omitidos conservan el valor actual;
 * `code` enviado como `null` o `""` lo borra. `name` y `price_usd` son obligatorios.
 * El stock no se edita aquí (si se envía debe coincidir con el actual): se cambia con un ajuste de stock para que quede registrado.
 */
export function validateProductUpdate(body: JsonObject, current: ProductRow): ProductData {
  const v = new Validator(body);
  const code = "code" in body ? readCode(v) : current.code;
  const name = readName(v);
  const price_usd_cents = readPriceCents(v);
  const active = v.boolean("active", { optional: true }) ?? current.active === 1;
  if (v.has("stock") && body.stock !== current.stock) {
    v.addError("stock", "El stock no se edita aquí: usa el ajuste de stock");
  }
  v.assertValid(INVALID_PRODUCT_MESSAGE);
  return { code, name, price_usd_cents, active };
}
