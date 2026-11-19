/**
 * Clave de búsqueda y orden para texto en español: minúsculas y sin diacríticos
 * (`"José Ñúñez"` -> `"jose nunez"`). Se guarda en columnas `*_key` y se aplica igual al término buscado.
 */
export function searchKey(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Texto de búsqueda de un registro: une las partes no vacías con un espacio y aplica `searchKey`
 * (`("Jugo de Piña", "JP-01")` -> `"jugo de pina jp-01"`). Se guarda en las columnas `search_text`.
 */
export function searchText(...parts: readonly (string | null | undefined)[]): string {
  return searchKey(collapseSpaces(parts.filter((part) => part?.trim()).join(" ")).trim());
}

/** Reemplaza cada secuencia de espacios en blanco por un único espacio. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

/** Escapa `\`, `%` y `_` para usar el texto literal en un `LIKE ... ESCAPE '\'`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
