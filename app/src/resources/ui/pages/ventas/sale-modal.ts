import { cartElements } from "./cart-elements";
import { elements } from "./elements";
import { isDesktop } from "./environment";
import { modalElements, saleModal } from "./modal-elements";
import { showReviewMode } from "./review-mode";
import { isCredit } from "./sale-totals";
import { runSearch } from "./search-request";
import { state } from "./state";

export function focusSaleModal(): void {
  if (state.saleDone) modalElements.newSaleButton.focus();
  else if (isCredit()) modalElements.submitButton.focus();
  else modalElements.receivedInput.focus();
}

export function startNewSale(): void {
  saleModal.hide();
}

export function onSaleModalHidden(): void {
  const wasDone = state.saleDone;
  showReviewMode();
  if (wasDone) {
    elements.searchInput.value = "";
    void runSearch("");
    elements.searchInput.focus();
    return;
  }
  if (isDesktop()) cartElements.confirmButton.focus();
  else cartElements.summaryCharge.focus();
}

export function isSaleModalReview(): boolean {
  return modalElements.saleModalElement.classList.contains("show") && !state.saleDone;
}
