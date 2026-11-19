import { cartElements } from "./cart-elements";
import { focusedControl, restoreFocus } from "./cart-focus";
import { lineElement, lineItem } from "./cart-line";
import { renderResults } from "./search-results";
import { saveCart, state } from "./state";
import { renderTotals } from "./totals-render";

export function renderCart(): void {
  const previous = focusedControl();
  cartElements.cartLines.replaceChildren(...state.cart.lines.map(lineElement));
  cartElements.cartEmpty.classList.toggle("d-none", state.cart.lines.length > 0);
  cartElements.clearButton.disabled = state.cart.lines.length === 0;
  restoreFocus(previous);
  renderTotals();
}

export function flashLine(productId: number): void {
  const item = lineItem(productId);
  if (!item) return;
  const { cartCard, cartHeader, cartCheckout } = cartElements;
  item.classList.remove("pos-line-flash");
  void item.offsetWidth;
  item.classList.add("pos-line-flash");
  cartCard.style.scrollPaddingTop = `${cartHeader.offsetHeight}px`;
  cartCard.style.scrollPaddingBottom = `${cartCheckout.offsetHeight}px`;
  item.scrollIntoView({ block: "nearest" });
}

export function cartChanged(): void {
  saveCart();
  renderCart();
  renderResults();
}
