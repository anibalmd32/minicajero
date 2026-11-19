import { onCartClick } from "./cart-actions";
import { cartElements } from "./cart-elements";
import { clearCart } from "./cart-reset";
import { elements } from "./elements";
import { onCustomerChange, onPaymentChange } from "./payment";
import { onCustomerChosen } from "./picker-instance";
import { onQuantityCommit, onQuantityInput, quantityTarget } from "./quantity-input";

function bindQuantityEvents(): void {
  const { cartLines } = cartElements;
  cartLines.addEventListener("input", (event) => {
    const target = quantityTarget(event);
    if (target) onQuantityInput(target.input, target.productId);
  });
  cartLines.addEventListener("change", (event) => {
    const target = quantityTarget(event);
    if (target) onQuantityCommit(target.input, target.productId);
  });
  cartLines.addEventListener("focusout", (event) => {
    const target = quantityTarget(event);
    if (target) onQuantityCommit(target.input, target.productId);
  });
  cartLines.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && quantityTarget(event)) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

export function bindCartEvents(): void {
  cartElements.cartLines.addEventListener("click", onCartClick);
  bindQuantityEvents();
  cartElements.clearButton.addEventListener("click", () => void clearCart());
  for (const input of cartElements.paymentInputs) input.addEventListener("change", onPaymentChange);
  onCustomerChosen(onCustomerChange);
}
