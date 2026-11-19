import {
  DEFAULT_PRINT_FORMAT,
  PRINT_FORMATS,
  type PrintFormat,
  pageRule,
  parsePrintFormat,
  ticketPageHeightMm,
} from "./print-format";
import { goBack } from "./print-navigation";
import { clearAutoPrintParam, isAutoPrintRequested, readStoredFormat, storeFormat } from "./print-preferences";

export { fetchOptionalSettings, hideBusinessHint, renderBusinessHeader, setOptionalLine } from "./print-business";

/** Elementos comunes de una vista imprimible (factura, estado de cuenta). */
export interface PrintPageElements {
  sheet: HTMLElement;
  pageRuleStyle: HTMLStyleElement;
  formatSelect: HTMLSelectElement;
  printButton: HTMLButtonElement;
  backLink: HTMLAnchorElement;
}

/** Control de la vista imprimible: imprimir, lanzar la impresión automática pedida con `?auto=1` y recalcular la página. */
export interface PrintPage {
  print: () => void;
  runAutoPrint: () => void;
  updatePageRule: () => void;
}

interface PrintState {
  format: PrintFormat;
  autoPrintPending: boolean;
}

const FORMAT_PARAM = "formato";

function updatePageRule(elements: PrintPageElements, state: PrintState): void {
  const ticketHeight =
    state.format === "ticket" ? ticketPageHeightMm(elements.sheet.getBoundingClientRect().height) : undefined;
  elements.pageRuleStyle.textContent = pageRule(state.format, ticketHeight);
}

function applyFormat(elements: PrintPageElements, state: PrintState, next: PrintFormat): void {
  state.format = next;
  for (const option of PRINT_FORMATS)
    document.body.classList.toggle(`print-format-${option.value}`, option.value === next);
  elements.formatSelect.value = next;
  updatePageRule(elements, state);
}

function print(elements: PrintPageElements, state: PrintState): void {
  if (elements.printButton.disabled) return;
  updatePageRule(elements, state);
  window.print();
}

function runAutoPrint(elements: PrintPageElements, state: PrintState): void {
  if (!state.autoPrintPending) return;
  state.autoPrintPending = false;
  clearAutoPrintParam();
  window.requestAnimationFrame(() => window.setTimeout(() => print(elements, state), 0));
}

function formatOption(option: (typeof PRINT_FORMATS)[number]): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = option.value;
  element.textContent = option.label;
  return element;
}

function bindControls(elements: PrintPageElements, state: PrintState): void {
  elements.formatSelect.replaceChildren(...PRINT_FORMATS.map(formatOption));
  elements.formatSelect.addEventListener("change", () => {
    const next = parsePrintFormat(elements.formatSelect.value) ?? DEFAULT_PRINT_FORMAT;
    storeFormat(next);
    applyFormat(elements, state, next);
  });
  applyFormat(elements, state, state.format);
  elements.backLink.addEventListener("click", goBack);
  elements.printButton.addEventListener("click", () => print(elements, state));
  window.addEventListener("beforeprint", () => updatePageRule(elements, state));
  window.addEventListener("resize", () => {
    if (state.format === "ticket") updatePageRule(elements, state);
  });
}

/**
 * Conecta la barra de impresión: selector de formato (Carta, A4, Ticket; `?formato=` o el último elegido),
 * regla `@page` acorde (el ticket con el alto de la hoja), botón Imprimir y «Volver» al historial si se llegó desde la app.
 */
export function setupPrintPage(elements: PrintPageElements): PrintPage {
  const params = new URLSearchParams(window.location.search);
  const state: PrintState = {
    format: parsePrintFormat(params.get(FORMAT_PARAM)) ?? readStoredFormat() ?? DEFAULT_PRINT_FORMAT,
    autoPrintPending: isAutoPrintRequested(params),
  };
  bindControls(elements, state);
  return {
    print: () => print(elements, state),
    runAutoPrint: () => runAutoPrint(elements, state),
    updatePageRule: () => updatePageRule(elements, state),
  };
}
