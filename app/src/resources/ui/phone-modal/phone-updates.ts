import type { PhoneInfo } from "../../../modules/phone/phone.protocol";
import type { PhoneStatus } from "../../../modules/phone/phone.service";
import { api, errorMessage } from "../api";
import { withBusyButton } from "../form";
import { toastError, toastSuccess } from "../toast";
import type { ModalParts } from "./modal-parts";
import { isOpen, state } from "./modal-state";
import { renderConnected, renderWaiting } from "./pairing-view";
import { renderPhoneList } from "./phone-list";

const AUTO_CLOSE_MS = 1500;

async function disconnectPhone(phone: PhoneInfo, button: HTMLButtonElement): Promise<void> {
  try {
    const status = await withBusyButton(
      button,
      () => api.delete<PhoneStatus>(`/phone/phones/${encodeURIComponent(phone.id)}`),
      "Desconectando…",
    );
    updatePhones(status.phones);
    toastSuccess("Teléfono desconectado");
  } catch (err) {
    updatePhones(state.phones.filter((other) => other.id !== phone.id));
    toastError(`No se pudo desconectar el teléfono. ${errorMessage(err)}`);
  }
}

export function renderModalPhones(ui: ModalParts): void {
  renderPhoneList(ui, state.phones, (phone, button) => void disconnectPhone(phone, button));
}

function onPhonesUpdated(): void {
  const ui = state.parts;
  if (!ui) return;
  renderModalPhones(ui);
  if (!isOpen() || !state.pairing) return;
  const newcomer = state.phones.some((phone) => !state.phonesWhenOpened.has(phone.id));
  if (!newcomer) {
    if (state.closeTimer === undefined) renderWaiting(ui);
    return;
  }
  renderConnected(ui);
  window.clearTimeout(state.closeTimer);
  state.closeTimer = window.setTimeout(() => state.parts?.modal.hide(), AUTO_CLOSE_MS);
}

export function updatePhones(next: readonly PhoneInfo[]): void {
  state.phones = next;
  state.renderNavButton();
  onPhonesUpdated();
}
