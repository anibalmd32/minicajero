const QUANTITY_PREFIX = /^(\d{1,4})\s*\*\s*(.*)$/;

/** Lo escrito en el buscador separado en cantidad y búsqueda: `3*harina` pide 3 unidades; sin prefijo, 1. */
export function parseQuantityPrefix(text: string): { quantity: number; query: string } {
  const trimmed = text.trim();
  const match = QUANTITY_PREFIX.exec(trimmed);
  if (!match) return { quantity: 1, query: trimmed };
  return { quantity: Math.max(1, Number(match[1])), query: (match[2] ?? "").trim() };
}

/**
 * Producto que agrega Enter en el buscador: el de código exacto (sin distinguir mayúsculas) o, si no hay,
 * el primero de la lista aunque no esté disponible, para avisar por qué no se agrega en vez de cambiarlo por otro.
 */
export function pickProductForEnter<T extends { code: string | null }>(
  products: readonly T[],
  query: string,
): T | undefined {
  const code = query.toLocaleUpperCase("es-VE");
  return (
    products.find((product) => product.code !== null && product.code.toLocaleUpperCase("es-VE") === code) ?? products[0]
  );
}
