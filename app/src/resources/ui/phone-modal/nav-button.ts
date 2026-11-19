import { onPhonesChange } from "../phone-events";
import { openPhoneModal } from "./modal-access";
import { state } from "./modal-state";
import { updatePhones } from "./phone-updates";

const PHONE_ICON = `
  <svg class="nav-phone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M5 1.5A1.5 1.5 0 0 0 3.5 3v10A1.5 1.5 0 0 0 5 14.5h6a1.5 1.5 0 0 0 1.5-1.5V3A1.5 1.5 0 0 0 11 1.5H5Zm0 1h6a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"/>
    <path d="M8 12.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/>
  </svg>`;

function phoneCountLabel(count: number): string {
  return count === 1 ? "1 teléfono conectado" : `${count} teléfonos conectados`;
}

function renderButton(button: HTMLButtonElement, count: HTMLElement): void {
  const connected = state.phones.length > 0;
  count.classList.toggle("d-none", !connected);
  const countValue = count.lastElementChild;
  if (countValue) countValue.textContent = String(state.phones.length);
  button.classList.toggle("is-connected", connected);
  const label = connected
    ? `Teléfono: ${phoneCountLabel(state.phones.length)}`
    : "Conectar un teléfono para escanear códigos";
  button.title = label;
  button.setAttribute("aria-label", label);
}

function createButton(): { button: HTMLButtonElement; count: HTMLElement } {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm btn-outline-light nav-phone";
  button.setAttribute("aria-haspopup", "dialog");
  button.innerHTML = `${PHONE_ICON}<span class="nav-phone-label">Teléfono</span><span class="nav-phone-count d-none"><span class="nav-phone-dot" aria-hidden="true"></span><span></span></span>`;
  const count = button.querySelector<HTMLElement>(".nav-phone-count");
  if (!count) throw new Error("Falta el contador del botón del teléfono");
  return { button, count };
}

/**
 * Pinta el botón "Teléfono" de la navbar (con un punto verde y la cantidad de teléfonos conectados) justo antes de `anchor`;
 * abre el diálogo para conectar uno.
 */
export function mountPhoneButton(anchor: Element): void {
  const { button, count } = createButton();
  button.addEventListener("click", openPhoneModal);
  anchor.before(button);
  state.renderNavButton = () => renderButton(button, count);
  state.renderNavButton();
  onPhonesChange(updatePhones);
}
