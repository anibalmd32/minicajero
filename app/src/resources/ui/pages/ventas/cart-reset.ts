import { confirmAction } from "../../confirm";
import { unitsLabel } from "../../products";
import { emptyCart } from "../../sale-cart";
import { cartElements } from "./cart-elements";
import { renderCart } from "./cart-render";
import { elements } from "./elements";
import { syncPaymentInputs } from "./payment";
import { hideSaleAlert } from "./sale-alert";
import { currentTotals } from "./sale-totals";
import { renderResults } from "./search-results";
import { clearAllMarks, saveCart, state } from "./state";
import { showStatus } from "./status";

export function resetSaleState(): void {
  state.cart = emptyCart();
  clearAllMarks();
  hideSaleAlert();
  saveCart();
  syncPaymentInputs();
  renderCart();
  renderResults();
}

export async function clearCart(): Promise<void> {
  if (state.cart.lines.length === 0) return;
  const confirmed = await confirmAction({
    title: "Vaciar carrito",
    message: `¿Quitar los ${unitsLabel(currentTotals().units)} del carrito? El cliente y la condición también se reinician.`,
    confirmText: "Vaciar",
    variant: "danger",
  });
  if (!confirmed) {
    cartElements.clearButton.focus();
    return;
  }
  resetSaleState();
  showStatus("Carrito vacío. Puedes empezar una venta nueva.", "success");
  elements.searchInput.focus();
}
