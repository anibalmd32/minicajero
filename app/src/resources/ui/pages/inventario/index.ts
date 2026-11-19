import "../../layout";
import { consumeNewRecordParam } from "../../list";
import { onMoneyChange } from "../../money";
import { registerScanHandler } from "../../phone-events";
import { elements } from "./elements";
import { PAGE_SIZE, session, state } from "./inventory-state";
import { renderPricePreview } from "./price-preview";
import {
  applyFilters,
  goToPage,
  loadProducts,
  renderPage,
  resetFilters,
  scheduleSearch,
  syncFilterInputs,
} from "./product-list";
import { bindProductModal, openProductModal } from "./product-modal";
import { onPhoneScan } from "./scan-handler";
import { onTableChange, onTableClick } from "./table-events";

function onEmptyAction(): void {
  if (session.emptyKind === "create") openProductModal();
  else resetFilters(session.emptyKind === "show-all");
}

function bindFilterEvents(): void {
  elements.searchInput.addEventListener("input", scheduleSearch);
  for (const input of elements.filterInputs) input.addEventListener("change", () => void applyFilters());
  elements.filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void applyFilters();
  });
}

function bindListEvents(): void {
  elements.retryButton.addEventListener("click", () => void loadProducts());
  elements.emptyAction.addEventListener("click", onEmptyAction);
  elements.prevButton.addEventListener("click", () => goToPage(state.offset - PAGE_SIZE));
  elements.nextButton.addEventListener("click", () => goToPage(state.offset + PAGE_SIZE));
  elements.tableBody.addEventListener("click", onTableClick);
  elements.tableBody.addEventListener("change", onTableChange);
}

function bindEvents(): void {
  elements.newButton.addEventListener("click", () => openProductModal());
  bindFilterEvents();
  bindListEvents();
  bindProductModal(loadProducts);
  onMoneyChange(() => {
    if (session.currentPage && session.currentPage.total > 0) renderPage(session.currentPage);
    renderPricePreview();
  });
}

elements.searchInput.value = state.q;
syncFilterInputs();
bindEvents();
registerScanHandler("inventario", onPhoneScan);
void loadProducts();
if (consumeNewRecordParam()) openProductModal();
