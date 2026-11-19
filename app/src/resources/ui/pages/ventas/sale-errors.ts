import { ApiError, errorMessage } from "../../api";
import { loadRateOverview } from "../../exchange-rate";
import { RATE_SETTINGS_URL } from "../../nav-status";
import { toastError } from "../../toast";
import { renderCart } from "./cart-render";
import { ITEM_DETAIL, PRODUCT_DETAIL, STALE_DETAIL } from "./constants";
import { isDesktop } from "./environment";
import { cartOffcanvas, modalElements, saleModal } from "./modal-elements";
import { refreshCartProducts } from "./refresh-cart";
import { showReviewChanges } from "./review-mode";
import { renderReview } from "./review-render";
import { showSaleAlert } from "./sale-alert";
import { refreshSaleData } from "./sale-basis";
import { blockingReason } from "./sale-totals";
import { currentQuery, runSearch } from "./search-request";
import { lineMarks, saveCart, state } from "./state";
import { renderTotals } from "./totals-render";

function lineIdsFromError(err: ApiError): Map<number, string> {
  const issues = new Map<number, string>();
  for (const [field, message] of Object.entries(err.details)) {
    const product = PRODUCT_DETAIL.exec(field);
    const item = ITEM_DETAIL.exec(field);
    const productId = product ? Number(product[1]) : item ? state.cart.lines[Number(item[1])]?.product_id : undefined;
    if (productId !== undefined) issues.set(productId, message);
  }
  return issues;
}

function showLineErrors(err: ApiError, issues: Map<number, string>): void {
  for (const [id, message] of issues) lineMarks.serverIssues.set(id, message);
  saleModal.hide();
  showSaleAlert(err.message);
  renderCart();
  if (!isDesktop()) cartOffcanvas.show();
  void refreshCartProducts([...issues.keys()]);
  void runSearch(currentQuery());
}

function showCustomerError(message: string): void {
  saleModal.hide();
  state.cart.customer = null;
  saveCart();
  renderTotals();
  toastError(`${message}. Elige otro cliente.`);
}

function showReviewError(err: unknown): void {
  const { reviewError, submitButton } = modalElements;
  reviewError.replaceChildren(errorMessage(err));
  if (err instanceof ApiError && err.status === 409 && /tasa/i.test(err.message)) {
    const link = document.createElement("a");
    link.href = RATE_SETTINGS_URL;
    link.className = "alert-link ms-1";
    link.textContent = "Fijar tasa manual";
    reviewError.append(link);
    void loadRateOverview().catch(() => undefined);
  }
  reviewError.classList.remove("d-none");
  submitButton.focus();
}

function isStaleSaleError(err: ApiError): boolean {
  return err.status === 409 && Object.keys(err.details).some((field) => STALE_DETAIL.test(field));
}

async function reloadStaleReview(err: ApiError): Promise<void> {
  const changes = await refreshSaleData();
  renderTotals();
  if (blockingReason() !== null) {
    saleModal.hide();
    return;
  }
  renderReview();
  showReviewChanges(changes.length > 0 ? changes : Object.values(err.details));
  modalElements.reviewChanges.scrollIntoView({ block: "nearest" });
}

async function handleApiError(err: ApiError): Promise<boolean> {
  if (isStaleSaleError(err)) {
    await reloadStaleReview(err);
    return true;
  }
  const issues = lineIdsFromError(err);
  if (issues.size > 0) {
    showLineErrors(err, issues);
    return true;
  }
  if (err.details.customer_id) {
    showCustomerError(err.details.customer_id);
    return true;
  }
  return false;
}

export async function handleSaleError(err: unknown): Promise<void> {
  if (err instanceof ApiError && (await handleApiError(err))) return;
  showReviewError(err);
}
