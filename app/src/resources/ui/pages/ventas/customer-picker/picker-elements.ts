import { Modal } from "../../../bootstrap";
import { requireElement } from "../../../dom";

export const pickerElements = {
  picker: requireElement<HTMLElement>("pos-customer-picker"),
  searchInput: requireElement<HTMLInputElement>("pos-customer-search"),
  optionsList: requireElement<HTMLElement>("pos-customer-options"),
  selectedBox: requireElement<HTMLElement>("pos-customer-selected"),
  selectedName: requireElement<HTMLElement>("pos-customer-name"),
  selectedMeta: requireElement<HTMLElement>("pos-customer-meta"),
  changeButton: requireElement<HTMLButtonElement>("pos-customer-change"),
  feedback: requireElement<HTMLElement>("pos-customer-feedback"),
  newButton: requireElement<HTMLButtonElement>("pos-customer-new"),
  modalElement: requireElement<HTMLElement>("customer-modal"),
  customerForm: requireElement<HTMLFormElement>("customer-form"),
  firstNameInput: requireElement<HTMLInputElement>("customer_first_name"),
  docNumberInput: requireElement<HTMLInputElement>("customer_doc_number"),
};

export const createModal = Modal.getOrCreateInstance(pickerElements.modalElement);
