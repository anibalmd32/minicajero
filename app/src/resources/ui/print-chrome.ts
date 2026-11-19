import { requireElement } from "./dom";
import { hideBusinessHint } from "./print-business";

/** Vistas posibles de una página imprimible. */
export type PrintView = "loading" | "error" | "sheet";

/** Barra de impresión y estados de carga y error comunes a las páginas imprimibles. */
export interface PrintChrome {
  pageRuleStyle: HTMLStyleElement;
  backLink: HTMLAnchorElement;
  toolbarTitle: HTMLElement;
  formatSelect: HTMLSelectElement;
  printButton: HTMLButtonElement;
  loading: HTMLElement;
  loadError: HTMLElement;
  loadErrorTitle: HTMLElement;
  loadErrorMessage: HTMLElement;
  retryButton: HTMLButtonElement;
}

/** Busca los elementos comunes de las páginas imprimibles. */
export function requirePrintChrome(): PrintChrome {
  return {
    pageRuleStyle: requireElement<HTMLStyleElement>("print-page-rule"),
    backLink: requireElement<HTMLAnchorElement>("print-back"),
    toolbarTitle: requireElement<HTMLElement>("print-toolbar-title"),
    formatSelect: requireElement<HTMLSelectElement>("print-format"),
    printButton: requireElement<HTMLButtonElement>("print-submit"),
    loading: requireElement<HTMLElement>("print-loading"),
    loadError: requireElement<HTMLElement>("print-error"),
    loadErrorTitle: requireElement<HTMLElement>("print-error-title"),
    loadErrorMessage: requireElement<HTMLElement>("print-error-message"),
    retryButton: requireElement<HTMLButtonElement>("print-retry"),
  };
}

/** Muestra una sola de las vistas (carga, error u hoja) y deshabilita Imprimir si no es la hoja. */
export function showPrintView(chrome: PrintChrome, sheet: HTMLElement, view: PrintView): void {
  chrome.loading.classList.toggle("d-none", view !== "loading");
  chrome.loadError.classList.toggle("d-none", view !== "error");
  sheet.classList.toggle("d-none", view !== "sheet");
  chrome.printButton.disabled = view !== "sheet";
  if (view !== "sheet") hideBusinessHint();
}

/** Muestra el error de carga con su título, mensaje y, si procede, el botón de reintentar. */
export function showPrintError(
  chrome: PrintChrome,
  sheet: HTMLElement,
  error: { title: string; message: string; canRetry: boolean; toolbarTitle: string },
): void {
  chrome.loadErrorTitle.textContent = error.title;
  chrome.loadErrorMessage.textContent = error.message;
  chrome.retryButton.classList.toggle("d-none", !error.canRetry);
  chrome.toolbarTitle.textContent = error.toolbarTitle;
  showPrintView(chrome, sheet, "error");
}
