import { requireElement } from "../../dom";

/** Elementos de la página de clientes, buscados una sola vez al cargar. */
export const elements = {
  newButton: requireElement<HTMLButtonElement>("customer-new"),
  filtersForm: requireElement<HTMLFormElement>("customer-filters"),
  searchInput: requireElement<HTMLInputElement>("customer-search"),
  debtorsSwitch: requireElement<HTMLInputElement>("customer-debtors"),
  loading: requireElement<HTMLElement>("customers-loading"),
  loadError: requireElement<HTMLElement>("customers-error"),
  loadErrorMessage: requireElement<HTMLElement>("customers-error-message"),
  retryButton: requireElement<HTMLButtonElement>("customers-retry"),
  empty: requireElement<HTMLElement>("customers-empty"),
  emptyTitle: requireElement<HTMLElement>("customers-empty-title"),
  emptyText: requireElement<HTMLElement>("customers-empty-text"),
  emptyAction: requireElement<HTMLButtonElement>("customers-empty-action"),
  list: requireElement<HTMLElement>("customers-list"),
  tableBody: requireElement<HTMLTableSectionElement>("customers-body"),
  countText: requireElement<HTMLElement>("customer-count"),
  prevButton: requireElement<HTMLButtonElement>("customers-prev"),
  nextButton: requireElement<HTMLButtonElement>("customers-next"),
  modalElement: requireElement<HTMLElement>("customer-modal"),
  modalTitle: requireElement<HTMLElement>("customer-modal-title"),
  customerForm: requireElement<HTMLFormElement>("customer-form"),
  firstNameInput: requireElement<HTMLInputElement>("customer_first_name"),
};
