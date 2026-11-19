import { requireElement } from "../../dom";

const filtersForm = requireElement<HTMLFormElement>("product-filters");

/** Elementos de la página de inventario, buscados una sola vez al cargar. */
export const elements = {
  newButton: requireElement<HTMLButtonElement>("product-new"),
  filtersForm,
  searchInput: requireElement<HTMLInputElement>("product-search"),
  filterInputs: [...filtersForm.querySelectorAll<HTMLInputElement>('input[name="filtro"]')],
  loading: requireElement<HTMLElement>("products-loading"),
  loadError: requireElement<HTMLElement>("products-error"),
  loadErrorMessage: requireElement<HTMLElement>("products-error-message"),
  retryButton: requireElement<HTMLButtonElement>("products-retry"),
  empty: requireElement<HTMLElement>("products-empty"),
  emptyTitle: requireElement<HTMLElement>("products-empty-title"),
  emptyText: requireElement<HTMLElement>("products-empty-text"),
  emptyAction: requireElement<HTMLButtonElement>("products-empty-action"),
  list: requireElement<HTMLElement>("products-list"),
  tableBody: requireElement<HTMLTableSectionElement>("products-body"),
  countText: requireElement<HTMLElement>("product-count"),
  thresholdText: requireElement<HTMLElement>("product-threshold"),
  prevButton: requireElement<HTMLButtonElement>("products-prev"),
  nextButton: requireElement<HTMLButtonElement>("products-next"),
  productModalElement: requireElement<HTMLElement>("product-modal"),
  productModalTitle: requireElement<HTMLElement>("product-modal-title"),
  productForm: requireElement<HTMLFormElement>("product-form"),
  nameInput: requireElement<HTMLInputElement>("product_name"),
  codeInput: requireElement<HTMLInputElement>("product_code"),
  stockInput: requireElement<HTMLInputElement>("product_stock"),
  saveButton: requireElement<HTMLButtonElement>("product-save"),
  priceInput: requireElement<HTMLInputElement>("product_price"),
  pricePreview: requireElement<HTMLElement>("product_price_preview"),
  initialStockGroup: requireElement<HTMLElement>("product_stock_group"),
  currentStockGroup: requireElement<HTMLElement>("product_stock_current"),
  currentStockValue: requireElement<HTMLElement>("product_stock_value"),
};
