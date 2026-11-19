import "../../layout";
import type { DateRangePreset } from "../../../../lib/dates";
import { restoreRowFocus } from "../../list";
import { onMoneyChange } from "../../money";
import { renderCustomerFilter } from "./customer-filter";
import { elements } from "./elements";
import { initControls } from "./filter-controls";
import {
  applyFilters,
  applyPreset,
  clearCustomer,
  clearDates,
  clearFilters,
  onDateChange,
  scheduleSearch,
} from "./filters";
import { setupInvoiceDetail } from "./invoice-detail";
import { goToPage, loadInvoices, rerenderPage } from "./invoice-list";
import { PAGE_SIZE, state } from "./list-state";
import { openInvoiceId, writeUrl } from "./url";

let returnFocusTo: HTMLElement | null = null;

const detail = setupInvoiceDetail({
  onClosed() {
    writeUrl(null);
    restoreRowFocus(returnFocusTo, elements.tableBody);
    returnFocusTo = null;
  },
  onChanged() {
    void loadInvoices();
  },
});

function openInvoice(id: number, trigger: HTMLElement | null): void {
  returnFocusTo = trigger;
  writeUrl(id);
  detail.open(id);
}

function onTableClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("a") || window.getSelection()?.toString()) return;
  const row = event.target.closest<HTMLTableRowElement>("tr[data-id]");
  if (!row) return;
  const button = row.querySelector<HTMLElement>('[data-action="view"]');
  openInvoice(Number(row.dataset.id), button);
}

function bindFilterEvents(): void {
  elements.searchInput.addEventListener("input", scheduleSearch);
  for (const input of elements.statusInputs) input.addEventListener("change", applyFilters);
  elements.fromInput.addEventListener("change", () => onDateChange(elements.fromInput));
  elements.toInput.addEventListener("change", () => onDateChange(elements.toInput));
  for (const button of elements.rangeButtons)
    button.addEventListener("click", () => applyPreset(button.dataset.range as DateRangePreset));
  elements.clearDatesButton.addEventListener("click", clearDates);
  elements.customerClear.addEventListener("click", clearCustomer);
  elements.filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });
}

function bindListEvents(): void {
  elements.retryButton.addEventListener("click", () => void loadInvoices());
  elements.emptyClear.addEventListener("click", clearFilters);
  elements.prevButton.addEventListener("click", () => goToPage(state.offset - PAGE_SIZE));
  elements.nextButton.addEventListener("click", () => goToPage(state.offset + PAGE_SIZE));
  elements.tableBody.addEventListener("click", onTableClick);
  onMoneyChange(() => {
    rerenderPage();
    detail.rerender();
  });
}

initControls();
bindFilterEvents();
bindListEvents();
void renderCustomerFilter();
const initialInvoice = openInvoiceId();
writeUrl(initialInvoice);
void loadInvoices();
if (initialInvoice !== null) openInvoice(initialInvoice, null);
