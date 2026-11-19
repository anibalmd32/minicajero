import { invoicePrintUrl } from "../../invoices";
import { cartElements } from "./cart-elements";
import { onReceivedCurrencyChange, renderChange } from "./change";
import { cartOffcanvas, modalElements } from "./modal-elements";
import { charge, openReview } from "./review-open";
import { focusSaleModal, onSaleModalHidden, startNewSale } from "./sale-modal";
import { submitSale } from "./sale-submit";
import { state } from "./state";

function bindCheckoutButtons(): void {
  const { confirmButton, summaryOpen, summaryCart, summaryCharge } = cartElements;
  confirmButton.addEventListener("click", () => void openReview());
  summaryOpen.addEventListener("click", () => cartOffcanvas.show());
  summaryCart.addEventListener("click", () => cartOffcanvas.show());
  summaryCharge.addEventListener("click", charge);
}

function bindChangeForm(): void {
  const { changeForm, receivedInput, receivedCurrencyInputs } = modalElements;
  changeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitSale();
  });
  receivedInput.addEventListener("input", renderChange);
  for (const input of receivedCurrencyInputs) input.addEventListener("change", onReceivedCurrencyChange);
}

export function bindSaleEvents(): void {
  const { submitButton, printButton, newSaleButton, saleModalElement } = modalElements;
  bindCheckoutButtons();
  submitButton.addEventListener("click", () => void submitSale());
  printButton.addEventListener("click", () => {
    if (state.lastInvoice) window.location.assign(invoicePrintUrl(state.lastInvoice.id, true));
  });
  newSaleButton.addEventListener("click", startNewSale);
  saleModalElement.addEventListener("shown.bs.modal", focusSaleModal);
  bindChangeForm();
  saleModalElement.addEventListener("hidden.bs.modal", onSaleModalHidden);
}
