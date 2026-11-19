import "../../layout";
import { consumeNewRecordParam } from "../../list";
import { onMoneyChange } from "../../money";
import {
  applyFilters,
  clearFilters,
  currentEmptyKind,
  findCustomer,
  loadCustomers,
  movePage,
  rerenderCustomers,
  scheduleSearch,
  syncFiltersForm,
} from "./customer-list";
import { bindCustomerModal, openCustomerModal } from "./customer-modal";
import { removeCustomer } from "./customer-removal";
import { elements } from "./elements";

function onTableClick(event: MouseEvent): void {
  const button =
    event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-action]") : null;
  if (!button) return;
  const customer = findCustomer(Number(button.dataset.id));
  if (!customer) return;
  if (button.dataset.action === "edit") openCustomerModal(customer);
  else void removeCustomer(customer, button, loadCustomers);
}

function onFiltersSubmit(event: SubmitEvent): void {
  event.preventDefault();
  applyFilters();
}

function bindEvents(): void {
  elements.newButton.addEventListener("click", () => openCustomerModal());
  elements.searchInput.addEventListener("input", scheduleSearch);
  elements.debtorsSwitch.addEventListener("change", applyFilters);
  elements.filtersForm.addEventListener("submit", onFiltersSubmit);
  elements.retryButton.addEventListener("click", () => void loadCustomers());
  elements.emptyAction.addEventListener("click", () =>
    currentEmptyKind() === "none" ? openCustomerModal() : clearFilters(),
  );
  elements.prevButton.addEventListener("click", () => movePage(-1));
  elements.nextButton.addEventListener("click", () => movePage(1));
  elements.tableBody.addEventListener("click", onTableClick);
  bindCustomerModal(loadCustomers);
  onMoneyChange(rerenderCustomers);
}

syncFiltersForm();
bindEvents();
void loadCustomers();
if (consumeNewRecordParam()) openCustomerModal();
