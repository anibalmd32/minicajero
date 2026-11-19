import { errorMessage } from "../../api";
import { type Customer, type CustomerPage, fetchCustomers } from "../../customers";
import { lastPageOffset, pageCountLabel } from "../../list";
import { customerRow } from "./customer-row";
import { elements } from "./elements";
import { type EmptyKind, renderEmptyState } from "./empty-state";
import { readStateFromUrl, writeStateToUrl } from "./list-state";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type ViewState = "loading" | "error" | "empty" | "ready";

const state = readStateFromUrl();
let currentPage: CustomerPage | null = null;
let listRequest = 0;
let searchTimer: number | undefined;
let emptyKind: EmptyKind = "none";

function showState(view: ViewState): void {
  elements.loading.classList.toggle("d-none", view !== "loading");
  elements.loadError.classList.toggle("d-none", view !== "error");
  elements.empty.classList.toggle("d-none", view !== "empty");
  elements.list.classList.toggle("d-none", view !== "ready");
}

function renderPage(page: CustomerPage): void {
  elements.tableBody.replaceChildren(...page.items.map(customerRow));
  elements.countText.textContent = pageCountLabel(page, "cliente", "clientes");
  elements.prevButton.disabled = page.offset === 0;
  elements.nextButton.disabled = page.offset + page.items.length >= page.total;
  elements.prevButton.parentElement?.classList.toggle("d-none", page.total <= PAGE_SIZE);
}

function showPage(page: CustomerPage): void {
  currentPage = page;
  if (page.total === 0) {
    emptyKind = renderEmptyState(state);
    showState("empty");
    return;
  }
  renderPage(page);
  showState("ready");
}

function fetchCurrentPage(): Promise<CustomerPage> {
  return fetchCustomers({ q: state.q, debtorsOnly: state.debtorsOnly, limit: PAGE_SIZE, offset: state.offset });
}

/** Carga la página actual del listado; si quedó fuera de rango salta a la última. */
export async function loadCustomers(): Promise<void> {
  const request = ++listRequest;
  if (elements.list.classList.contains("d-none")) showState("loading");
  elements.list.setAttribute("aria-busy", "true");
  try {
    const page = await fetchCurrentPage();
    if (request !== listRequest) return;
    if (page.total > 0 && page.items.length === 0 && state.offset > 0) {
      state.offset = lastPageOffset(page.total, PAGE_SIZE);
      return loadCustomers();
    }
    showPage(page);
  } catch (err) {
    if (request !== listRequest) return;
    elements.loadErrorMessage.textContent = errorMessage(err);
    showState("error");
  } finally {
    if (request === listRequest) elements.list.removeAttribute("aria-busy");
  }
}

/** Aplica los filtros del formulario, vuelve a la primera página y los guarda en la URL. */
export function applyFilters(): void {
  window.clearTimeout(searchTimer);
  state.q = elements.searchInput.value.trim();
  state.debtorsOnly = elements.debtorsSwitch.checked;
  state.offset = 0;
  writeStateToUrl(state);
  void loadCustomers();
}

/** Aplica la búsqueda tras una pausa al escribir. */
export function scheduleSearch(): void {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    if (elements.searchInput.value.trim() !== state.q) applyFilters();
  }, SEARCH_DEBOUNCE_MS);
}

/** Quita los filtros y devuelve el foco al buscador. */
export function clearFilters(): void {
  elements.searchInput.value = "";
  elements.debtorsSwitch.checked = false;
  applyFilters();
  elements.searchInput.focus();
}

/** Pasa a la página anterior (`-1`) o siguiente (`1`). */
export function movePage(direction: -1 | 1): void {
  state.offset = Math.max(0, state.offset + direction * PAGE_SIZE);
  void loadCustomers();
}

/** Cliente de la página visible con ese id. */
export function findCustomer(id: number): Customer | undefined {
  return currentPage?.items.find((customer) => customer.id === id);
}

/** Vuelve a pintar la página visible (p. ej. al cambiar la moneda principal). */
export function rerenderCustomers(): void {
  if (currentPage && currentPage.total > 0) renderPage(currentPage);
}

/** Motivo del último estado vacío mostrado. */
export function currentEmptyKind(): EmptyKind {
  return emptyKind;
}

/** Copia los filtros leídos de la URL al formulario. */
export function syncFiltersForm(): void {
  elements.searchInput.value = state.q;
  elements.debtorsSwitch.checked = state.debtorsOnly;
}
