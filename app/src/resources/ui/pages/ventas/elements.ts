import { requireElement } from "../../dom";

/** Elementos del buscador de productos y sus resultados, buscados una sola vez al cargar. */
export const elements = {
  searchForm: requireElement<HTMLFormElement>("pos-search-form"),
  searchInput: requireElement<HTMLInputElement>("pos-search"),
  searchStatus: requireElement<HTMLElement>("pos-search-status"),
  resultsLoading: requireElement<HTMLElement>("pos-results-loading"),
  resultsError: requireElement<HTMLElement>("pos-results-error"),
  resultsErrorMessage: requireElement<HTMLElement>("pos-results-error-message"),
  resultsRetry: requireElement<HTMLButtonElement>("pos-results-retry"),
  resultsEmpty: requireElement<HTMLElement>("pos-results-empty"),
  resultsEmptyTitle: requireElement<HTMLElement>("pos-results-empty-title"),
  resultsEmptyText: requireElement<HTMLElement>("pos-results-empty-text"),
  resultsEmptyLink: requireElement<HTMLAnchorElement>("pos-results-empty-link"),
  resultsList: requireElement<HTMLElement>("pos-results"),
  resultsMore: requireElement<HTMLElement>("pos-results-more"),
};
