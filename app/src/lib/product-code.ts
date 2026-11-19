/** Longitud máxima del código de un producto (alcanza para cualquier código de barras habitual). */
export const PRODUCT_CODE_MAX_LENGTH = 64;

/**
 * Caracteres ASCII imprimibles sin espacios en los extremos: cubre EAN-13/8, UPC, ITF, Code 39 y Code 128,
 * además de los códigos internos escritos a mano (`HAR-001`).
 */
export const PRODUCT_CODE_PATTERN = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/;

/** Forma en que se guarda y se compara un código: recortado y en mayúsculas. `null` si no es válido. */
export function normalizeProductCode(raw: string): string | null {
  const code = raw.trim();
  if (code.length === 0 || code.length > PRODUCT_CODE_MAX_LENGTH || !PRODUCT_CODE_PATTERN.test(code)) return null;
  return code.toUpperCase();
}
