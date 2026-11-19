import { BadRequestError } from "../../lib/http-errors";
import { parseQueryFlag } from "../../lib/request";
import { collapseSpaces, searchKey } from "../../lib/text";
import type { ProductFilter, ProductQuery } from "./products.types";

const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 6;

function readSearchTerms(q: string): string[] {
  return q === "" ? [] : searchKey(q).split(" ").slice(0, SEARCH_MAX_TERMS);
}

/**
 * Interpreta los criterios del listado. `q` se divide en palabras y todas deben aparecer en el nombre o el código
 * (sin distinguir mayúsculas ni tildes); un producto cuyo código coincide exactamente con `q` (sin distinguir mayúsculas) va primero.
 * `active=1|0` filtra por estado, `low_stock=1` deja solo los productos con stock menor o igual al umbral
 * y `out_of_stock=1` solo los que no tienen stock (tiene prioridad sobre `low_stock`).
 */
export function parseProductFilter(query: ProductQuery, lowStockThreshold: number): ProductFilter {
  const q = collapseSpaces(query.q?.trim() ?? "");
  if (q.length > SEARCH_MAX_LENGTH) {
    throw new BadRequestError("Parámetros de búsqueda inválidos", {
      q: `Debe tener como máximo ${SEARCH_MAX_LENGTH} caracteres`,
    });
  }
  const lowStockOnly = parseQueryFlag(query.low_stock, "low_stock") ?? false;
  const outOfStockOnly = parseQueryFlag(query.out_of_stock, "out_of_stock") ?? false;
  return {
    terms: readSearchTerms(q),
    exactCode: q === "" ? null : q.toUpperCase(),
    active: parseQueryFlag(query.active, "active"),
    maxStock: outOfStockOnly ? 0 : lowStockOnly ? lowStockThreshold : null,
  };
}
