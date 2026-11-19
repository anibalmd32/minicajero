import { Modal } from "../../bootstrap";
import {
  type Customer,
  type CustomerInput,
  createCustomer,
  customerFullName,
  editableDocNumber,
  formatPhone,
  updateCustomer,
} from "../../customers";
import { bindForm, clearFieldErrors, type FormValues, fillForm } from "../../form";
import { restoreRowFocus } from "../../list";
import { toastSuccess } from "../../toast";
import { elements } from "./elements";

const modal = Modal.getOrCreateInstance(elements.modalElement);
let editingId: number | null = null;
let modalSession = 0;
let returnFocusTo: HTMLElement | null = null;

function fillCustomer(customer: Customer): void {
  fillForm(elements.customerForm, {
    first_name: customer.first_name,
    last_name: customer.last_name,
    doc_type: customer.doc_type,
    doc_number: editableDocNumber(customer),
    phone: formatPhone(customer.phone),
  });
}

/** Abre el modal para registrar un cliente nuevo o editar el indicado. */
export function openCustomerModal(customer?: Customer): void {
  modalSession += 1;
  editingId = customer?.id ?? null;
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  elements.modalTitle.textContent = customer ? "Editar cliente" : "Nuevo cliente";
  elements.customerForm.reset();
  clearFieldErrors(elements.customerForm);
  if (customer) fillCustomer(customer);
  modal.show();
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

async function saveCustomer(values: FormValues, onSaved: () => Promise<void>): Promise<void> {
  const input = toInput(values);
  const id = editingId;
  const session = modalSession;
  const saved = id === null ? await createCustomer(input) : await updateCustomer(id, input);
  if (session === modalSession) modal.hide();
  toastSuccess(`Cliente ${customerFullName(saved)} (${saved.document}) ${id === null ? "registrado" : "actualizado"}`);
  await onSaved();
}

function onModalHidden(): void {
  clearFieldErrors(elements.customerForm);
  editingId = null;
  restoreRowFocus(returnFocusTo, elements.tableBody);
  returnFocusTo = null;
}

/** Conecta el formulario del modal; `onSaved` recarga el listado tras guardar. */
export function bindCustomerModal(onSaved: () => Promise<void>): void {
  elements.modalElement.addEventListener("shown.bs.modal", () => elements.firstNameInput.focus());
  elements.modalElement.addEventListener("hidden.bs.modal", onModalHidden);
  bindForm(elements.customerForm, (values) => saveCustomer(values, onSaved));
}
