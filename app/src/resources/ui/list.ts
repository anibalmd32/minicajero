import { formatInteger } from "./format";

/** Página de un listado paginado de la API. */
export interface ListPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Crea un elemento con texto plano y clases. */
export function textElement(tag: string, text: string, className = ""): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/** Crea una celda `<td>` con las clases dadas. */
export function tableCell(className = ""): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = className;
  return td;
}

/** Texto del contador del listado: `12 clientes` o `Mostrando 21–40 de 57 clientes`. */
export function pageCountLabel(page: ListPage<unknown>, singular: string, plural: string): string {
  const noun = page.total === 1 ? singular : plural;
  if (page.total <= page.items.length) return `${formatInteger(page.total)} ${noun}`;
  const first = page.offset + 1;
  const last = page.offset + page.items.length;
  return `Mostrando ${formatInteger(first)}–${formatInteger(last)} de ${formatInteger(page.total)} ${noun}`;
}

/** Desplazamiento de la última página que tiene elementos. */
export function lastPageOffset(total: number, pageSize: number): number {
  return Math.max(0, Math.floor((total - 1) / pageSize) * pageSize);
}

function isVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

/** Control visible de la fila con `data-action` igual a `action` (las filas tienen versiones compacta y completa). */
export function visibleRowAction(row: Element | null | undefined, action: string): HTMLElement | undefined {
  if (!row) return undefined;
  const buttons = row.querySelectorAll<HTMLElement>(`[data-action="${CSS.escape(action)}"]`);
  return [...buttons].find(isVisible);
}

/**
 * Devuelve el foco a `target`. Si la tabla se volvió a pintar y el botón ya no existe,
 * enfoca el botón equivalente (mismo `data-action` y `data-id`) de la fila nueva.
 */
export function restoreRowFocus(target: HTMLElement | null, tableBody: HTMLElement): void {
  if (!target) return;
  if (target.isConnected) {
    target.focus();
    return;
  }
  const { action, id } = target.dataset;
  if (!action || !id) return;
  const row = tableBody.querySelector(`[data-id="${CSS.escape(id)}"]`)?.closest("tr");
  visibleRowAction(row, action)?.focus();
}

/** Parámetro de la URL que pide abrir el formulario de alta al cargar la página (`/clientes?nuevo=1`). */
export const NEW_RECORD_PARAM = "nuevo";

/** ¿La URL pide abrir el formulario de alta? Si es así, quita el parámetro para que recargar no lo vuelva a abrir. */
export function consumeNewRecordParam(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get(NEW_RECORD_PARAM) !== "1") return false;
  url.searchParams.delete(NEW_RECORD_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}
