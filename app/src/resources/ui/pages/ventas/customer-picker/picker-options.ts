import { customerFullName } from "../../../customers";
import { textElement } from "../../../list";
import { formatDual } from "../../../money";
import type { PickerOption } from "./picker.types";
import { pickerElements } from "./picker-elements";
import { pickerState } from "./picker-state";

const { optionsList, searchInput } = pickerElements;

export function isOpen(): boolean {
  return !optionsList.classList.contains("d-none");
}

export function setOpen(open: boolean): void {
  optionsList.classList.toggle("d-none", !open);
  searchInput.setAttribute("aria-expanded", String(open));
  if (!open) {
    pickerState.activeIndex = -1;
    searchInput.removeAttribute("aria-activedescendant");
  }
}

function fillWalkIn(item: HTMLElement): void {
  item.append(
    textElement("span", "Consumidor final", "fw-semibold"),
    textElement("span", "Sin datos del cliente", "small text-body-secondary"),
  );
}

function fillCreate(item: HTMLElement): void {
  const { lastQuery } = pickerState;
  item.classList.add("text-primary");
  item.append(
    textElement(
      "span",
      lastQuery ? `+ Crear cliente «${lastQuery}»` : "+ Crear cliente nuevo",
      "fw-semibold text-break",
    ),
  );
}

function fillCustomer(item: HTMLElement, option: Extract<PickerOption, { kind: "customer" }>): void {
  const { customer } = option;
  item.append(textElement("span", customerFullName(customer), "fw-semibold text-break"));
  const meta = textElement("span", customer.document, "small text-body-secondary");
  if (customer.balance_usd_cents > 0) {
    const debt = document.createElement("span");
    debt.className = "text-danger";
    debt.innerHTML = ` · Debe ${formatDual(customer.balance_usd_cents)}`;
    meta.append(debt);
  }
  item.append(meta);
}

function fillOption(item: HTMLElement, option: PickerOption): void {
  if (option.kind === "walk-in") fillWalkIn(item);
  else if (option.kind === "create") fillCreate(item);
  else fillCustomer(item, option);
}

function optionElement(option: PickerOption, index: number): HTMLElement {
  const item = document.createElement("button");
  item.type = "button";
  item.tabIndex = -1;
  item.id = `pos-customer-option-${index}`;
  item.className = "list-group-item list-group-item-action pos-customer-option";
  item.setAttribute("role", "option");
  item.dataset.index = String(index);
  fillOption(item, option);
  const selected = index === pickerState.activeIndex;
  item.classList.toggle("active", selected);
  item.setAttribute("aria-selected", String(selected));
  return item;
}

function statusItem(text: string, className = ""): HTMLElement {
  const item = textElement("div", text, `list-group-item small text-body-secondary ${className}`.trim());
  item.setAttribute("role", "presentation");
  return item;
}

function insertStatus(items: HTMLElement[]): void {
  const { options, loading, loadError, lastQuery } = pickerState;
  const statusAt = options[0]?.kind === "walk-in" ? 1 : 0;
  if (loading) items.splice(statusAt, 0, statusItem("Buscando clientes…"));
  else if (loadError) items.splice(statusAt, 0, statusItem(`No se pudo buscar: ${loadError}`, "text-danger"));
  else if (lastQuery !== "" && !options.some((option) => option.kind === "customer")) {
    items.splice(statusAt, 0, statusItem(`Ningún cliente coincide con «${lastQuery}».`));
  }
}

export function renderOptions(): void {
  const items: HTMLElement[] = pickerState.options.map(optionElement);
  insertStatus(items);
  optionsList.replaceChildren(...items);
  const { activeIndex } = pickerState;
  if (activeIndex >= 0) {
    searchInput.setAttribute("aria-activedescendant", `pos-customer-option-${activeIndex}`);
    optionsList.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  } else {
    searchInput.removeAttribute("aria-activedescendant");
  }
}
