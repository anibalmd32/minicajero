import { errorMessage } from "../../api";
import type { Product } from "../../products";
import { searchSaleProducts } from "../../products";
import { parseQuantityPrefix } from "../../sale-cart";
import { RESULTS_LIMIT, SEARCH_DEBOUNCE_MS } from "./constants";
import { elements } from "./elements";
import { renderResults, showResultsView } from "./search-results";
import { state } from "./state";

const { searchInput, resultsList } = elements;

export function currentQuery(): string {
  return parseQuantityPrefix(searchInput.value).query;
}

async function loadResults(query: string, request: number): Promise<Product[] | null> {
  try {
    const page = await searchSaleProducts(query, RESULTS_LIMIT);
    if (request === state.searchRequest) {
      state.results = page.items;
      state.resultsTotal = page.total;
      state.resultsQuery = query;
      state.activeIndex = -1;
      renderResults();
    }
    return page.items;
  } catch (err) {
    if (request === state.searchRequest) {
      elements.resultsErrorMessage.textContent = errorMessage(err);
      state.resultsQuery = null;
      showResultsView("error");
    }
    return null;
  } finally {
    if (request === state.searchRequest) {
      resultsList.removeAttribute("aria-busy");
      state.pendingSearch = null;
    }
  }
}

export function runSearch(query: string): Promise<Product[] | null> {
  window.clearTimeout(state.searchTimer);
  const request = ++state.searchRequest;
  if (state.resultsQuery === null) showResultsView("loading");
  resultsList.setAttribute("aria-busy", "true");
  const task = loadResults(query, request);
  state.pendingSearch = task;
  return task;
}

export function scheduleSearch(): void {
  window.clearTimeout(state.searchTimer);
  if (currentQuery() === state.resultsQuery && state.pendingSearch === null) return;
  state.searchTimer = window.setTimeout(() => void runSearch(currentQuery()), SEARCH_DEBOUNCE_MS);
}

export function moveActive(step: number): void {
  if (state.results.length === 0) return;
  const next = state.activeIndex < 0 ? 0 : state.activeIndex + step;
  state.activeIndex = Math.min(Math.max(next, 0), state.results.length - 1);
  renderResults();
}
