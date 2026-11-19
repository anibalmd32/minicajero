import { setButtonBusy } from "../../form";
import { cartElements } from "./cart-elements";
import { resetChangeForm } from "./change";
import { cartOffcanvas, modalElements, saleModal } from "./modal-elements";
import { customerPicker } from "./picker-instance";
import { showReviewChanges, showReviewMode } from "./review-mode";
import { renderReview } from "./review-render";
import { refreshSaleData } from "./sale-basis";
import { blockingReason } from "./sale-totals";
import { state } from "./state";
import { renderTotals } from "./totals-render";

const CUSTOMER_FOCUS_DELAY_MS = 350;

export async function openReview(): Promise<void> {
  if (blockingReason() !== null) return;
  const { confirmButton } = cartElements;
  setButtonBusy(confirmButton, true, "Preparando…");
  const changes = await refreshSaleData();
  setButtonBusy(confirmButton, false);
  renderTotals();
  if (blockingReason() !== null) return;
  showReviewMode();
  resetChangeForm();
  renderReview();
  showReviewChanges(changes);
  modalElements.reviewItems.open = false;
  cartOffcanvas.hide();
  saleModal.show();
}

export function charge(): void {
  if (blockingReason() === null) {
    void openReview();
    return;
  }
  cartOffcanvas.show();
  if (state.cart.payment_type === "credit" && !state.cart.customer) {
    window.setTimeout(() => customerPicker.focus(), CUSTOMER_FOCUS_DELAY_MS);
  }
}
