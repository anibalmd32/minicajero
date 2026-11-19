import { parseIntegerInput } from "../../format";
import { unitsLabel } from "../../products";
import { findLine, setQuantity } from "../../sale-cart";
import { lineItem, updateLineElement } from "./cart-line";
import { renderResults } from "./search-results";
import { lineMarks, saveCart, state } from "./state";
import { renderTotals } from "./totals-render";

export function quantityTarget(event: Event): { input: HTMLInputElement; productId: number } | null {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.dataset.action !== "quantity") return null;
  const item = input.closest<HTMLElement>(".pos-line");
  return item ? { input, productId: Number(item.dataset.id) } : null;
}

function applyTypedQuantity(input: HTMLInputElement, productId: number, parsed: number): void {
  const line = findLine(state.cart, productId);
  lineMarks.inputErrors.delete(productId);
  const applied = setQuantity(state.cart, productId, parsed);
  if (applied?.capped && line) {
    lineMarks.lineNotices.set(productId, `Solo hay ${unitsLabel(line.stock)} disponibles.`);
    input.value = String(applied.quantity);
  }
  lineMarks.serverIssues.delete(productId);
  saveCart();
}

function typedQuantityError(parsed: number | null): string {
  return parsed === null ? "Escribe la cantidad." : "La cantidad debe ser un número entero mayor que 0.";
}

export function onQuantityInput(input: HTMLInputElement, productId: number): void {
  const line = findLine(state.cart, productId);
  if (!line) return;
  lineMarks.lineNotices.delete(productId);
  const parsed = parseIntegerInput(input.value);
  if (parsed === null || Number.isNaN(parsed) || parsed < 1) {
    lineMarks.inputErrors.set(productId, typedQuantityError(parsed));
  } else {
    applyTypedQuantity(input, productId, parsed);
  }
  const item = lineItem(productId);
  if (item) updateLineElement(item, line, false);
  renderTotals();
  renderResults();
}

export function onQuantityCommit(input: HTMLInputElement, productId: number): void {
  const line = findLine(state.cart, productId);
  if (!line) return;
  lineMarks.inputErrors.delete(productId);
  input.value = String(line.quantity);
  const item = lineItem(productId);
  if (item) updateLineElement(item, line, true);
  renderTotals();
}
