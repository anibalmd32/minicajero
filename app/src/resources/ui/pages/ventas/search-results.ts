import { formatInteger } from "../../format";
import { textElement } from "../../list";
import { formatDual } from "../../money";
import type { Product } from "../../products";
import { quantityInCart } from "../../sale-cart";
import type { ResultsView } from "./constants";
import { elements } from "./elements";
import { state } from "./state";

const { searchInput, resultsList, resultsMore } = elements;

function availableToAdd(product: Product): number {
  return Math.max(0, product.stock - quantityInCart(state.cart, product.id));
}

export function showResultsView(view: ResultsView): void {
  elements.resultsLoading.classList.toggle("d-none", view !== "loading");
  elements.resultsError.classList.toggle("d-none", view !== "error");
  elements.resultsEmpty.classList.toggle("d-none", view !== "empty");
  resultsList.classList.toggle("d-none", view !== "ready");
  searchInput.setAttribute("aria-expanded", String(view === "ready"));
}

function stockLabel(product: Product): HTMLElement {
  if (product.stock <= 0) return textElement("span", "Agotado", "pos-result-stock is-out");
  if (availableToAdd(product) === 0) return textElement("span", "Todo en el carrito", "pos-result-stock");
  const className = product.low_stock ? "pos-result-stock is-low" : "pos-result-stock";
  return textElement("span", `${formatInteger(product.stock)} disp.`, className);
}

function resultMain(product: Product): HTMLElement {
  const main = document.createElement("span");
  main.className = "pos-result-main";
  main.append(textElement("span", product.name, "pos-result-name"));
  const meta = document.createElement("span");
  meta.className = "pos-result-meta";
  const inCart = quantityInCart(state.cart, product.id);
  if (product.code) meta.append(textElement("span", product.code, "pos-result-code"));
  if (inCart > 0) meta.append(textElement("span", `${formatInteger(inCart)} en el carrito`, "pos-result-in-cart"));
  if (meta.childElementCount > 0) main.append(meta);
  return main;
}

function resultRow(product: Product, index: number): HTMLButtonElement {
  const row = document.createElement("button");
  row.type = "button";
  row.id = `pos-result-${index}`;
  row.className = "pos-result";
  row.dataset.index = String(index);
  row.setAttribute("role", "option");
  row.tabIndex = -1;
  const unavailable = availableToAdd(product) === 0;
  row.disabled = unavailable;
  row.setAttribute("aria-disabled", String(unavailable));
  row.setAttribute("aria-selected", String(index === state.activeIndex));
  row.classList.toggle("is-active", index === state.activeIndex);
  const price = document.createElement("span");
  price.className = "pos-result-price amount-cell";
  price.innerHTML = formatDual(product.price_usd_cents);
  const add = textElement("span", "+", "pos-result-add");
  add.setAttribute("aria-hidden", "true");
  row.append(resultMain(product), price, stockLabel(product), add);
  return row;
}

function renderEmptyResults(): void {
  const query = state.resultsQuery ?? "";
  elements.resultsEmptyTitle.textContent = query ? "Ningún producto coincide" : "No hay productos para vender";
  elements.resultsEmptyText.textContent = query
    ? `No se encontraron productos activos para «${query}». Prueba con otro código o nombre.`
    : "Registra productos activos en el inventario para poder venderlos.";
  elements.resultsEmptyLink.classList.toggle("d-none", query !== "");
}

function renderMoreNote(): void {
  const hidden = state.resultsTotal - state.results.length;
  resultsMore.classList.toggle("d-none", hidden <= 0);
  resultsMore.textContent =
    hidden > 0
      ? `Mostrando ${formatInteger(state.results.length)} de ${formatInteger(state.resultsTotal)} productos: escribe más para afinar la búsqueda.`
      : "";
}

function syncActiveDescendant(): void {
  if (state.activeIndex >= 0) {
    searchInput.setAttribute("aria-activedescendant", `pos-result-${state.activeIndex}`);
    resultsList.querySelector(`[data-index="${state.activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  } else {
    searchInput.removeAttribute("aria-activedescendant");
  }
}

export function renderResults(): void {
  if (state.resultsQuery === null) return;
  if (state.results.length === 0) {
    renderEmptyResults();
    showResultsView("empty");
    resultsMore.classList.add("d-none");
    return;
  }
  resultsList.replaceChildren(...state.results.map(resultRow));
  showResultsView("ready");
  renderMoreNote();
  syncActiveDescendant();
}
