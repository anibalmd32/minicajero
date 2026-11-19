import { errorMessage } from "../../api";
import { lastPageOffset, pageCountLabel } from "../../list";
import { fetchProducts, type ProductFilter, type ProductPage } from "../../products";
import { elements } from "./elements";
import { lowStockRule, renderEmpty } from "./empty-state";
import { PAGE_SIZE, session, state, writeStateToUrl } from "./inventory-state";
import { productRow } from "./product-row";

const SEARCH_DEBOUNCE_MS = 300;

type ViewState = "loading" | "error" | "empty" | "ready";

function selectedFilter(): ProductFilter {
  const value = elements.filterInputs.find((input) => input.checked)?.value;
  return value === "low" || value === "out" || value === "inactive" ? value : "all";
}

/** Marca en la barra de filtros el filtro activo. */
export function syncFilterInputs(): void {
  for (const input of elements.filterInputs) input.checked = input.value === state.filter;
}

function showState(view: ViewState): void {
  elements.loading.classList.toggle("d-none", view !== "loading");
  elements.loadError.classList.toggle("d-none", view !== "error");
  elements.empty.classList.toggle("d-none", view !== "empty");
  elements.list.classList.toggle("d-none", view !== "ready");
}

/** Pinta la página de productos y la paginación. */
export function renderPage(page: ProductPage): void {
  elements.tableBody.replaceChildren(...page.items.map(productRow));
  elements.countText.textContent = pageCountLabel(page, "producto", "productos");
  elements.thresholdText.textContent = state.filter === "low" ? ` · Stock bajo: ${lowStockRule()}` : "";
  elements.prevButton.disabled = page.offset === 0;
  elements.nextButton.disabled = page.offset + page.items.length >= page.total;
  elements.prevButton.parentElement?.classList.toggle("d-none", page.total <= PAGE_SIZE);
}

function showLoaded(page: ProductPage): void {
  session.currentPage = page;
  if (page.total === 0) {
    renderEmpty();
    showState("empty");
    return;
  }
  renderPage(page);
  showState("ready");
}

/** Consulta el listado con la búsqueda y el filtro actuales; ignora respuestas ya reemplazadas por otra consulta. */
export async function loadProducts(): Promise<void> {
  const request = ++session.listRequest;
  if (elements.list.classList.contains("d-none")) showState("loading");
  elements.list.setAttribute("aria-busy", "true");
  try {
    const page = await fetchProducts({ q: state.q, filter: state.filter, limit: PAGE_SIZE, offset: state.offset });
    if (request !== session.listRequest) return;
    if (page.total > 0 && page.items.length === 0 && state.offset > 0) {
      state.offset = lastPageOffset(page.total, PAGE_SIZE);
      return loadProducts();
    }
    showLoaded(page);
  } catch (err) {
    if (request !== session.listRequest) return;
    elements.loadErrorMessage.textContent = errorMessage(err);
    showState("error");
  } finally {
    if (request === session.listRequest) elements.list.removeAttribute("aria-busy");
  }
}

/** Aplica la búsqueda y el filtro del formulario y recarga desde la primera página. */
export function applyFilters(): Promise<void> {
  window.clearTimeout(session.searchTimer);
  state.q = elements.searchInput.value.trim();
  state.filter = selectedFilter();
  state.offset = 0;
  writeStateToUrl();
  return loadProducts();
}

export function scheduleSearch(): void {
  window.clearTimeout(session.searchTimer);
  session.searchTimer = window.setTimeout(() => {
    if (elements.searchInput.value.trim() !== state.q) void applyFilters();
  }, SEARCH_DEBOUNCE_MS);
}

export function resetFilters(keepSearch: boolean): void {
  if (!keepSearch) elements.searchInput.value = "";
  state.filter = "all";
  syncFilterInputs();
  void applyFilters();
  elements.searchInput.focus();
}

export function goToPage(offset: number): void {
  state.offset = Math.max(0, offset);
  void loadProducts();
}
