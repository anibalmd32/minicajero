import type { CustomerPicker, CustomerPickerHooks } from "./picker.types";
import { bindCreateModal, openCreateModal } from "./picker-create";
import { pickerElements } from "./picker-elements";
import { cancelEditing, onKeyDown, onOptionPointer } from "./picker-keys";
import { isOpen, setOpen } from "./picker-options";
import { scheduleSearch, search } from "./picker-search";
import { renderFeedback, showSelection } from "./picker-selection";
import { pickerState } from "./picker-state";

export type { CustomerPicker, CustomerPickerHooks } from "./picker.types";

const { searchInput, optionsList, changeButton, newButton } = pickerElements;

function openOptions(): void {
  if (isOpen()) return;
  setOpen(true);
  void search();
}

function startEditing(): void {
  pickerState.editing = true;
  showSelection();
  searchInput.focus();
  setOpen(true);
  void search();
}

function cancelEditingWhenBlurred(): void {
  window.setTimeout(() => {
    if (document.activeElement !== searchInput) cancelEditing();
  }, 0);
}

function bindEvents(): void {
  searchInput.addEventListener("input", scheduleSearch);
  searchInput.addEventListener("click", openOptions);
  searchInput.addEventListener("keydown", onKeyDown);
  searchInput.addEventListener("blur", cancelEditingWhenBlurred);
  optionsList.addEventListener("mousedown", (event) => event.preventDefault());
  optionsList.addEventListener("click", onOptionPointer);
  changeButton.addEventListener("click", startEditing);
  newButton.addEventListener("click", () => openCreateModal(searchInput.value.trim()));
  bindCreateModal();
}

function focusPicker(): void {
  if (pickerState.current && !pickerState.editing) changeButton.focus();
  else searchInput.focus();
}

/** Monta el buscador de clientes (typeahead con "Consumidor final") y el alta rápida en modal. */
export function mountCustomerPicker(hooks: CustomerPickerHooks): CustomerPicker {
  pickerState.onChange = hooks.onChange;
  bindEvents();
  return {
    render(customer, paymentType) {
      pickerState.current = customer;
      pickerState.currentPayment = paymentType;
      if (!pickerState.editing || customer === null) showSelection();
      renderFeedback(paymentType);
    },
    focus: focusPicker,
  };
}
