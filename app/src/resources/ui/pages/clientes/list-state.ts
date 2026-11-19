const DEBTORS_PARAM = "deudores";
const SEARCH_PARAM = "q";

/** Filtros y posición del listado de clientes. */
export interface ListState {
  q: string;
  debtorsOnly: boolean;
  offset: number;
}

/** Lee los filtros de la URL (`?q=` y `?deudores=1`). */
export function readStateFromUrl(): ListState {
  const params = new URLSearchParams(window.location.search);
  const flag = params.get(DEBTORS_PARAM)?.trim().toLowerCase() ?? "";
  return { q: params.get(SEARCH_PARAM)?.trim() ?? "", debtorsOnly: flag === "1" || flag === "true", offset: 0 };
}

/** Refleja los filtros en la URL sin crear una entrada nueva en el historial. */
export function writeStateToUrl(state: ListState): void {
  const url = new URL(window.location.href);
  if (state.q) url.searchParams.set(SEARCH_PARAM, state.q);
  else url.searchParams.delete(SEARCH_PARAM);
  if (state.debtorsOnly) url.searchParams.set(DEBTORS_PARAM, "1");
  else url.searchParams.delete(DEBTORS_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** ¿Hay algún filtro activo? */
export function hasFilters(state: ListState): boolean {
  return state.q !== "" || state.debtorsOnly;
}
