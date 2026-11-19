import type { Product, ProductFilter, ProductPage } from "../../products";

export const PAGE_SIZE = 20;

const SEARCH_PARAM = "q";
const FILTER_PARAM = "filtro";

const FILTER_SLUGS: Record<ProductFilter, string> = { all: "", low: "bajo", out: "agotados", inactive: "inactivos" };

export type EmptyKind = "create" | "clear" | "show-all";

export interface ListState {
  q: string;
  filter: ProductFilter;
  offset: number;
}

function filterFromSlug(slug: string): ProductFilter {
  const match = Object.entries(FILTER_SLUGS).find(([, value]) => value !== "" && value === slug);
  return (match?.[0] as ProductFilter | undefined) ?? "all";
}

function readStateFromUrl(): ListState {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get(FILTER_PARAM)?.trim().toLowerCase() ?? "";
  return { q: params.get(SEARCH_PARAM)?.trim() ?? "", filter: filterFromSlug(slug), offset: 0 };
}

/** Búsqueda, filtro y página actuales del listado. */
export const state: ListState = readStateFromUrl();

/** Datos mutables de la página que no son parte de la búsqueda. */
export const session: {
  currentPage: ProductPage | null;
  listRequest: number;
  searchTimer: number | undefined;
  emptyKind: EmptyKind;
  editingProduct: Product | null;
  modalSession: number;
  returnFocusTo: HTMLElement | null;
} = {
  currentPage: null,
  listRequest: 0,
  searchTimer: undefined,
  emptyKind: "create",
  editingProduct: null,
  modalSession: 0,
  returnFocusTo: null,
};

export function writeStateToUrl(): void {
  const url = new URL(window.location.href);
  if (state.q) url.searchParams.set(SEARCH_PARAM, state.q);
  else url.searchParams.delete(SEARCH_PARAM);
  const slug = FILTER_SLUGS[state.filter];
  if (slug) url.searchParams.set(FILTER_PARAM, slug);
  else url.searchParams.delete(FILTER_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function findProduct(id: number): Product | undefined {
  return session.currentPage?.items.find((product) => product.id === id);
}
