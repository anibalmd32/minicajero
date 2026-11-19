import { Modal } from "../bootstrap";
import { MODAL_ID, MODAL_TEMPLATE } from "./modal-template";

export interface ModalParts {
  element: HTMLElement;
  modal: InstanceType<typeof Modal>;
  pair: HTMLElement;
  qr: HTMLElement;
  networks: HTMLElement;
  network: HTMLSelectElement;
  error: HTMLElement;
  errorText: HTMLElement;
  retry: HTMLButtonElement;
  status: HTMLElement;
  phonesSection: HTMLElement;
  phonesList: HTMLUListElement;
}

function requirePart<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const part = root.querySelector<T>(`[data-role="${role}"]`);
  if (!part) throw new Error(`Falta el elemento "${role}" del diálogo del teléfono`);
  return part;
}

function createModalElement(): HTMLElement {
  const element = document.createElement("div");
  element.className = "modal fade";
  element.id = MODAL_ID;
  element.tabIndex = -1;
  element.setAttribute("aria-labelledby", `${MODAL_ID}-title`);
  element.setAttribute("aria-hidden", "true");
  element.innerHTML = MODAL_TEMPLATE;
  document.body.append(element);
  return element;
}

export function createModalParts(): ModalParts {
  const element = createModalElement();
  return {
    element,
    modal: Modal.getOrCreateInstance(element),
    pair: requirePart(element, "pair"),
    qr: requirePart(element, "qr"),
    networks: requirePart(element, "networks"),
    network: requirePart(element, "network"),
    error: requirePart(element, "error"),
    errorText: requirePart(element, "error-text"),
    retry: requirePart(element, "retry"),
    status: requirePart(element, "status"),
    phonesSection: requirePart(element, "phones-section"),
    phonesList: requirePart(element, "phones"),
  };
}
