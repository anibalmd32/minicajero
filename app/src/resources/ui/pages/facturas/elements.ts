import { requireElement } from "../../dom";

const filtersForm = requireElement<HTMLFormElement>("invoice-filters");

/** Elementos de la página de facturas, buscados una sola vez al cargar. */
export const elements = {
  filtersForm,
  searchInput: requireElement<HTMLInputElement>("invoice-search"),
  statusInputs: [...filtersForm.querySelectorAll<HTMLInputElement>('input[name="estado"]')],
  fromInput: requireElement<HTMLInputElement>("invoice-from"),
  toInput: requireElement<HTMLInputElement>("invoice-to"),
  rangeButtons: [...filtersForm.querySelectorAll<HTMLButtonElement>("button[data-range]")],
  clearDatesButton: requireElement<HTMLButtonElement>("invoice-dates-clear"),
  customerFilter: requireElement<HTMLElement>("invoice-customer-filter"),
  customerLabel: requireElement<HTMLElement>("invoice-customer-label"),
  customerClear: requireElement<HTMLButtonElement>("invoice-customer-clear"),
  loading: requireElement<HTMLElement>("invoices-loading"),
  loadError: requireElement<HTMLElement>("invoices-error"),
  loadErrorMessage: requireElement<HTMLElement>("invoices-error-message"),
  retryButton: requireElement<HTMLButtonElement>("invoices-retry"),
  empty: requireElement<HTMLElement>("invoices-empty"),
  emptyTitle: requireElement<HTMLElement>("invoices-empty-title"),
  emptyText: requireElement<HTMLElement>("invoices-empty-text"),
  emptySale: requireElement<HTMLAnchorElement>("invoices-empty-sale"),
  emptyClear: requireElement<HTMLButtonElement>("invoices-empty-clear"),
  list: requireElement<HTMLElement>("invoices-list"),
  totalsCount: requireElement<HTMLElement>("invoice-totals-count"),
  totalsAmount: requireElement<HTMLElement>("invoice-totals-amount"),
  totalsBalance: requireElement<HTMLElement>("invoice-totals-balance"),
  tableBody: requireElement<HTMLTableSectionElement>("invoices-body"),
  countText: requireElement<HTMLElement>("invoice-count"),
  prevButton: requireElement<HTMLButtonElement>("invoices-prev"),
  nextButton: requireElement<HTMLButtonElement>("invoices-next"),
};
