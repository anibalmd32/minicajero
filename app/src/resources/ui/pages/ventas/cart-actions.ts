import { unitsLabel } from "../../products";
import { findLine, removeLine, setQuantity } from "../../sale-cart";
import { cartElements } from "./cart-elements";
import { lineItem } from "./cart-line";
import { cartChanged } from "./cart-render";
import { elements } from "./elements";
import { isDesktop } from "./environment";
import { clearProductMarks, lineMarks, state } from "./state";

function changeQuantity(productId: number, step: number): void {
  const line = findLine(state.cart, productId);
  if (!line) return;
  lineMarks.inputErrors.delete(productId);
  lineMarks.serverIssues.delete(productId);
  const applied = setQuantity(state.cart, productId, line.quantity + step);
  if (applied?.capped) lineMarks.lineNotices.set(productId, `Solo hay ${unitsLabel(line.stock)} disponibles.`);
  else lineMarks.lineNotices.delete(productId);
  cartChanged();
}

function removeProduct(productId: number): void {
  const { lines } = state.cart;
  const index = lines.findIndex((line) => line.product_id === productId);
  removeLine(state.cart, productId);
  clearProductMarks(productId);
  cartChanged();
  const next = state.cart.lines[Math.min(index, state.cart.lines.length - 1)];
  const target = next ? lineItem(next.product_id)?.querySelector<HTMLElement>('[data-action="remove"]') : null;
  (target ?? (isDesktop() ? elements.searchInput : cartElements.clearButton)).focus();
}

export function onCartClick(event: MouseEvent): void {
  const control =
    event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-action]") : null;
  const item = control?.closest<HTMLElement>(".pos-line");
  if (!control || !item) return;
  const productId = Number(item.dataset.id);
  if (control.dataset.action === "decrease") changeQuantity(productId, -1);
  else if (control.dataset.action === "increase") changeQuantity(productId, 1);
  else if (control.dataset.action === "remove") removeProduct(productId);
}
