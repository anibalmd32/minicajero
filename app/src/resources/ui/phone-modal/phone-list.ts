import type { PhoneInfo } from "../../../modules/phone/phone.protocol";
import { formatTime } from "../format";
import type { ModalParts } from "./modal-parts";

export type DisconnectHandler = (phone: PhoneInfo, button: HTMLButtonElement) => void;

function phoneText(phone: PhoneInfo): HTMLElement {
  const text = document.createElement("div");
  text.className = "flex-grow-1 min-w-0";
  const name = document.createElement("div");
  name.className = "fw-semibold text-break";
  name.textContent = phone.name;
  const since = document.createElement("div");
  since.className = "small text-body-secondary";
  since.textContent = `Conectado desde las ${formatTime(phone.connected_at)}`;
  text.append(name, since);
  return text;
}

function connectedDot(): HTMLElement {
  const dot = document.createElement("span");
  dot.className = "nav-phone-dot flex-shrink-0";
  dot.setAttribute("aria-hidden", "true");
  return dot;
}

function disconnectButton(phone: PhoneInfo, onDisconnect: DisconnectHandler): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm btn-outline-danger flex-shrink-0";
  button.textContent = "Desconectar";
  button.setAttribute("aria-label", `Desconectar ${phone.name}`);
  button.addEventListener("click", () => onDisconnect(phone, button));
  return button;
}

function phoneItem(phone: PhoneInfo, onDisconnect: DisconnectHandler): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "list-group-item d-flex align-items-center gap-2 phone-list-item";
  item.append(connectedDot(), phoneText(phone), disconnectButton(phone, onDisconnect));
  return item;
}

export function renderPhoneList(ui: ModalParts, phones: readonly PhoneInfo[], onDisconnect: DisconnectHandler): void {
  ui.phonesSection.classList.toggle("d-none", phones.length === 0);
  ui.phonesList.replaceChildren(...phones.map((phone) => phoneItem(phone, onDisconnect)));
}
