import { type DateRangePreset, presetDateRange } from "../../../../lib/dates";
import { renderCustomerFilter } from "./customer-filter";
import { elements } from "./elements";
import { selectedStatus, syncDateControls } from "./filter-controls";
import { loadInvoices } from "./invoice-list";
import { state } from "./list-state";
import { writeUrl } from "./url";

const SEARCH_DEBOUNCE_MS = 300;
const { searchInput, fromInput, toInput } = elements;

let searchTimer: number | undefined;

/** Lee los controles, los guarda en el estado, actualiza la dirección y recarga desde la primera página. */
export function applyFilters(): void {
  window.clearTimeout(searchTimer);
  state.q = searchInput.value.trim();
  state.status = selectedStatus();
  state.from = fromInput.value;
  state.to = toInput.value;
  state.offset = 0;
  syncDateControls();
  writeUrl();
  void loadInvoices();
}

/** Aplica la búsqueda tras una pausa al escribir. */
export function scheduleSearch(): void {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    if (searchInput.value.trim() !== state.q) applyFilters();
  }, SEARCH_DEBOUNCE_MS);
}

/** Cambio de una fecha: mantiene «desde» no posterior a «hasta». */
export function onDateChange(changed: HTMLInputElement): void {
  if (fromInput.value && toInput.value && fromInput.value > toInput.value) {
    if (changed === fromInput) toInput.value = fromInput.value;
    else fromInput.value = toInput.value;
  }
  applyFilters();
}

/** Aplica un rango de fechas rápido (hoy, semana, mes…). */
export function applyPreset(preset: DateRangePreset): void {
  const range = presetDateRange(preset);
  fromInput.value = range.from;
  toInput.value = range.to;
  applyFilters();
}

/** Borra el rango de fechas. */
export function clearDates(): void {
  fromInput.value = "";
  toInput.value = "";
  applyFilters();
  fromInput.focus();
}

/** Quita el filtro por cliente. */
export function clearCustomer(): void {
  state.customerId = null;
  void renderCustomerFilter();
  applyFilters();
  searchInput.focus();
}

/** Quita todos los filtros. */
export function clearFilters(): void {
  searchInput.value = "";
  for (const input of elements.statusInputs) input.checked = input.value === "";
  fromInput.value = "";
  toInput.value = "";
  state.customerId = null;
  void renderCustomerFilter();
  applyFilters();
  searchInput.focus();
}
