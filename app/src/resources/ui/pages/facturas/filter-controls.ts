import { type DateRangePreset, presetDateRange } from "../../../../lib/dates";
import type { InvoiceStatus } from "../../invoices";
import { elements } from "./elements";
import { state } from "./list-state";

const { fromInput, toInput } = elements;

/** Estado marcado en el filtro, o `null` si es «Todas». */
export function selectedStatus(): InvoiceStatus | null {
  const value = elements.statusInputs.find((input) => input.checked)?.value ?? "";
  return value === "" ? null : (value as InvoiceStatus);
}

/** Ajusta los límites de las fechas, el botón de limpiar y el rango rápido activo. */
export function syncDateControls(): void {
  toInput.min = fromInput.value;
  fromInput.max = toInput.value;
  elements.clearDatesButton.classList.toggle("d-none", !fromInput.value && !toInput.value);
  for (const button of elements.rangeButtons) {
    const range = presetDateRange(button.dataset.range as DateRangePreset);
    const active = range.from === fromInput.value && range.to === toInput.value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

/** Pone en los controles los filtros leídos de la dirección. */
export function initControls(): void {
  elements.searchInput.value = state.q;
  for (const input of elements.statusInputs) input.checked = input.value === (state.status ?? "");
  fromInput.value = state.from;
  toInput.value = state.to;
  if (state.from && state.to && state.from > state.to) toInput.value = state.from;
  state.from = fromInput.value;
  state.to = toInput.value;
  syncDateControls();
}
