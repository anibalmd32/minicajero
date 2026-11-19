import { RATE_OVERVIEW_EVENT } from "../../exchange-rate";
import { onMoneyChange } from "../../money";
import { cartElements } from "./cart-elements";
import { renderCart } from "./cart-render";
import { showCartSetup, watchCartSetup } from "./cart-setup";
import { modalElements } from "./modal-elements";
import { renderRate } from "./rate-render";
import { renderReview } from "./review-render";
import { isSaleModalReview } from "./sale-modal";
import { renderResults } from "./search-results";
import { onGlobalKeyDown } from "./shortcuts";

function renderRateNotes(): void {
  renderRate(cartElements.rateUsed);
  if (isSaleModalReview()) renderRate(modalElements.reviewRate);
}

export function bindGlobalEvents(): void {
  document.addEventListener("keydown", onGlobalKeyDown);
  onMoneyChange(() => {
    renderResults();
    renderCart();
    if (isSaleModalReview()) renderReview();
  });
  for (const type of [RATE_OVERVIEW_EVENT, "online", "offline"]) window.addEventListener(type, renderRateNotes);
  cartElements.checkoutWho.addEventListener("click", showCartSetup);
  watchCartSetup();
}
