import { type PrintFormat, parsePrintFormat } from "./print-format";

const FORMAT_STORAGE_KEY = "minicajero.print-format";
const AUTO_PRINT_PARAM = "auto";

/** Último formato de impresión elegido, o `null` si no hay o no se puede leer. */
export function readStoredFormat(): PrintFormat | null {
  try {
    return parsePrintFormat(window.localStorage.getItem(FORMAT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Guarda el formato de impresión elegido. */
export function storeFormat(value: PrintFormat): void {
  try {
    window.localStorage.setItem(FORMAT_STORAGE_KEY, value);
  } catch {
    return;
  }
}

/** Quita `?auto=1` de la dirección para que recargar no vuelva a imprimir. */
export function clearAutoPrintParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(AUTO_PRINT_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

/** `true` si la dirección pide imprimir al cargar. */
export function isAutoPrintRequested(params: URLSearchParams): boolean {
  return params.get(AUTO_PRINT_PARAM) === "1";
}
