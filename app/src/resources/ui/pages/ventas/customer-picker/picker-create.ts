import { type CustomerInput, createCustomer, customerFullName } from "../../../customers";
import { bindForm, clearFieldErrors, type FormValues, fillForm } from "../../../form";
import { toastSuccess } from "../../../toast";
import { toCartCustomer } from "./cart-customer";
import { createModal, pickerElements } from "./picker-elements";
import { setOpen } from "./picker-options";
import { pickerState } from "./picker-state";

const DOCUMENT_QUERY = /^([VEJ])?[-\s.]?(\d[\d.-]*)$/i;

const { modalElement, customerForm, firstNameInput, docNumberInput, searchInput, changeButton } = pickerElements;

function prefillFromQuery(query: string): Record<string, string> {
  const document = DOCUMENT_QUERY.exec(query);
  if (document) return { doc_type: (document[1] ?? "V").toUpperCase(), doc_number: document[2] ?? "" };
  const [first = "", ...rest] = query.split(/\s+/).filter(Boolean);
  return { first_name: first, last_name: rest.join(" ") };
}

export function openCreateModal(query: string): void {
  setOpen(false);
  customerForm.reset();
  clearFieldErrors(customerForm);
  fillForm(customerForm, prefillFromQuery(query));
  createModal.show();
}

function toInput(values: FormValues): CustomerInput {
  return {
    first_name: values.first_name ?? "",
    last_name: values.last_name ?? "",
    doc_type: values.doc_type ?? "",
    doc_number: values.doc_number ?? "",
    phone: values.phone ?? "",
  };
}

async function saveCustomer(values: FormValues): Promise<void> {
  const saved = await createCustomer(toInput(values));
  pickerState.editing = false;
  searchInput.value = "";
  pickerState.onChange(toCartCustomer(saved));
  createModal.hide();
  toastSuccess(`Cliente ${customerFullName(saved)} (${saved.document}) registrado y seleccionado`);
}

function focusFirstEmptyField(): void {
  const target =
    firstNameInput.value === "" ? firstNameInput : docNumberInput.value === "" ? docNumberInput : firstNameInput;
  target.focus();
}

function restoreFocusAfterModal(): void {
  clearFieldErrors(customerForm);
  if (pickerState.current) changeButton.focus();
  else searchInput.focus();
}

export function bindCreateModal(): void {
  modalElement.addEventListener("shown.bs.modal", focusFirstEmptyField);
  modalElement.addEventListener("hidden.bs.modal", restoreFocusAfterModal);
  bindForm(customerForm, saveCustomer);
}
