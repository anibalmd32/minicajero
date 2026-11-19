import type { ProductFilter } from "../../products";
import { unitsLabel } from "../../products";
import { elements } from "./elements";
import { session, state } from "./inventory-state";

export function lowStockRule(): string {
  return `${unitsLabel(session.currentPage?.low_stock_threshold ?? 0)} o menos`;
}

const FILTER_EMPTY_TEXTS: Record<Exclude<ProductFilter, "all">, () => { title: string; text: string }> = {
  low: () => ({
    title: "Nada con stock bajo",
    text: `Ningún producto activo tiene ${lowStockRule()}. El inventario está bien surtido.`,
  }),
  out: () => ({ title: "Nada agotado", text: "Todos los productos activos tienen existencias." }),
  inactive: () => ({ title: "No hay productos inactivos", text: "Los productos que desactives aparecerán aquí." }),
};

const FILTER_NOUNS: Record<ProductFilter, string> = {
  all: "",
  low: " con stock bajo",
  out: " sin stock",
  inactive: " inactivos",
};

function renderSearchEmpty(): void {
  session.emptyKind = "clear";
  elements.emptyTitle.textContent = "Ningún producto coincide";
  elements.emptyText.textContent = `No se encontraron productos${FILTER_NOUNS[state.filter]} para «${state.q}». Prueba con otro código o nombre.`;
  elements.emptyAction.textContent = "Quitar filtros";
}

function renderFilterEmpty(filter: Exclude<ProductFilter, "all">): void {
  session.emptyKind = "show-all";
  const { title, text } = FILTER_EMPTY_TEXTS[filter]();
  elements.emptyTitle.textContent = title;
  elements.emptyText.textContent = text;
  elements.emptyAction.textContent = "Ver todos los productos";
}

function renderNoProductsEmpty(): void {
  session.emptyKind = "create";
  elements.emptyTitle.textContent = "Aún no hay productos";
  elements.emptyText.textContent = "Registra tus productos con su precio en dólares y su stock para empezar a vender.";
  elements.emptyAction.textContent = "Registrar el primer producto";
}

export function renderEmpty(): void {
  if (state.q !== "") renderSearchEmpty();
  else if (state.filter !== "all") renderFilterEmpty(state.filter);
  else renderNoProductsEmpty();
}
