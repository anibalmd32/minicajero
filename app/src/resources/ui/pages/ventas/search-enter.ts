import type { Product } from "../../products";
import { parseQuantityPrefix, pickProductForEnter } from "../../sale-cart";
import { addToCart } from "./cart-add";
import { elements } from "./elements";
import { hasFinePointer } from "./environment";
import { moveActive, runSearch } from "./search-request";
import { state } from "./state";
import { showStatus } from "./status";

const { searchInput } = elements;

async function findEnterTarget(query: string): Promise<Product | undefined | null> {
  const fresh = query === state.resultsQuery && state.pendingSearch === null ? state.results : await runSearch(query);
  return fresh === null ? null : pickProductForEnter(fresh, query);
}

function reportMissingProduct(text: string, query: string): void {
  showStatus(query ? `No se encontró ningún producto para «${query}».` : "No hay productos para agregar.", "danger");
  if (searchInput.value.trim() === text) searchInput.select();
}

async function addFromEnter(text: string, chosen: Product | undefined): Promise<void> {
  const { quantity, query } = parseQuantityPrefix(text);
  let target = chosen;
  if (!target) {
    const found = await findEnterTarget(query);
    if (found === null) return;
    target = found;
  }
  if (!target) {
    reportMissingProduct(text, query);
    return;
  }
  const added = addToCart(target, quantity) === "added";
  if (added && searchInput.value.trim() === text && text !== "") {
    searchInput.value = "";
    void runSearch("");
  }
}

function onSearchEnter(): void {
  const text = searchInput.value.trim();
  const { query } = parseQuantityPrefix(text);
  const chosen = state.activeIndex >= 0 && query === state.resultsQuery ? state.results[state.activeIndex] : undefined;
  if (query === "" && !chosen) {
    showStatus("Escribe o escanea un código, o elige un producto con las flechas.", "warning");
    return;
  }
  window.clearTimeout(state.searchTimer);
  state.enterQueue = state.enterQueue.then(() => addFromEnter(text, chosen));
}

export function onSearchKeyDown(event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    onSearchEnter();
  } else if (event.key === "Escape" && searchInput.value !== "") {
    event.preventDefault();
    searchInput.value = "";
    void runSearch("");
  }
}

export function onResultClick(event: MouseEvent): void {
  const card = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".pos-result") : null;
  const product = card ? state.results[Number(card.dataset.index)] : undefined;
  if (!card || !product || card.disabled) return;
  state.activeIndex = Number(card.dataset.index);
  const { quantity, query } = parseQuantityPrefix(searchInput.value);
  const added = addToCart(product, quantity) === "added";
  if (added && quantity > 1) searchInput.value = query;
  if (hasFinePointer()) searchInput.focus();
}
