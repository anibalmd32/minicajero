import { toCartCustomer } from "./cart-customer";
import type { PickerOption } from "./picker.types";
import { openCreateModal } from "./picker-create";
import { pickerElements } from "./picker-elements";
import { isOpen, renderOptions, setOpen } from "./picker-options";
import { scheduleSearch, search } from "./picker-search";
import { showSelection } from "./picker-selection";
import { pickerState } from "./picker-state";

const { searchInput, changeButton } = pickerElements;

function choose(option: PickerOption): void {
  if (option.kind === "create") {
    openCreateModal(searchInput.value.trim());
    return;
  }
  const next = option.kind === "walk-in" ? null : toCartCustomer(option.customer);
  pickerState.editing = false;
  searchInput.value = "";
  setOpen(false);
  pickerState.onChange(next);
  if (next) changeButton.focus();
  else searchInput.focus();
}

export function cancelEditing(): void {
  setOpen(false);
  if (!pickerState.editing) return;
  pickerState.editing = false;
  searchInput.value = "";
  showSelection();
  if (pickerState.current) changeButton.focus();
}

function moveActive(step: number): void {
  if (!isOpen()) {
    setOpen(true);
    void search();
    return;
  }
  const { options, activeIndex } = pickerState;
  if (options.length === 0) return;
  pickerState.activeIndex =
    activeIndex < 0 ? (step > 0 ? 0 : options.length - 1) : (activeIndex + step + options.length) % options.length;
  renderOptions();
}

function onEnter(): void {
  if (pickerState.loading) return;
  const option = pickerState.options[pickerState.activeIndex];
  if (isOpen() && option) choose(option);
  else if (!isOpen()) scheduleSearch();
}

export function onKeyDown(event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    onEnter();
  } else if (event.key === "Escape" && (isOpen() || pickerState.editing)) {
    event.preventDefault();
    event.stopPropagation();
    cancelEditing();
  }
}

export function onOptionPointer(event: MouseEvent): void {
  event.preventDefault();
  const item = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-index]") : null;
  const option = item ? pickerState.options[Number(item.dataset.index)] : undefined;
  if (option) choose(option);
}
