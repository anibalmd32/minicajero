import { errorMessage } from "../../../api";
import { type Customer, fetchCustomers } from "../../../customers";
import type { PickerOption } from "./picker.types";
import { pickerElements } from "./picker-elements";
import { renderOptions, setOpen } from "./picker-options";
import { pickerState, RESULTS_LIMIT, SEARCH_DEBOUNCE_MS } from "./picker-state";

function buildOptions(customers: Customer[]): PickerOption[] {
  const found = customers.map((customer): PickerOption => ({ kind: "customer", customer }));
  const walkIn: PickerOption[] = pickerState.currentPayment === "credit" ? [] : [{ kind: "walk-in" }];
  return [...walkIn, ...found, { kind: "create" }];
}

function firstActiveIndex(query: string): number {
  const { options } = pickerState;
  const firstCustomer = options.findIndex((option) => option.kind === "customer");
  return query === "" ? -1 : firstCustomer >= 0 ? firstCustomer : options.length - 1;
}

export async function search(): Promise<void> {
  window.clearTimeout(pickerState.searchTimer);
  const query = pickerElements.searchInput.value.trim();
  const id = ++pickerState.request;
  pickerState.lastQuery = query;
  pickerState.loading = true;
  pickerState.loadError = null;
  renderOptions();
  try {
    const page = await fetchCustomers({ q: query, debtorsOnly: false, limit: RESULTS_LIMIT, offset: 0 });
    if (id !== pickerState.request) return;
    pickerState.options = buildOptions(page.items);
    pickerState.activeIndex = firstActiveIndex(query);
  } catch (err) {
    if (id !== pickerState.request) return;
    pickerState.options = buildOptions([]);
    pickerState.loadError = errorMessage(err);
  } finally {
    if (id === pickerState.request) {
      pickerState.loading = false;
      renderOptions();
    }
  }
}

export function scheduleSearch(): void {
  window.clearTimeout(pickerState.searchTimer);
  setOpen(true);
  pickerState.searchTimer = window.setTimeout(() => void search(), SEARCH_DEBOUNCE_MS);
}
