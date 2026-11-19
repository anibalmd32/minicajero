import type { ModalParts } from "./modal-parts";
import { state } from "./modal-state";
import { cancelUnusedPairing, loadPairing } from "./pairing-session";
import { renderQr } from "./pairing-view";
import { renderModalPhones } from "./phone-updates";

function onShow(ui: ModalParts): void {
  state.phase = "opening";
  state.phonesWhenOpened = new Set(state.phones.map((phone) => phone.id));
  state.pairing = null;
  renderModalPhones(ui);
  void loadPairing(ui, true);
}

function onShown(ui: ModalParts): void {
  state.phase = "open";
  ui.element.querySelector<HTMLElement>(".btn-close")?.focus();
}

function onHidden(ui: ModalParts): void {
  state.phase = "closed";
  cancelUnusedPairing(state.pairing);
  state.pairing = null;
  state.pairingRequest += 1;
  window.clearTimeout(state.renewTimer);
  window.clearTimeout(state.closeTimer);
  state.closeTimer = undefined;
  ui.status.textContent = "";
}

export function bindModal(ui: ModalParts): void {
  ui.network.addEventListener("change", () => renderQr(ui));
  ui.retry.addEventListener("click", () => void loadPairing(ui, true));
  ui.element.addEventListener("show.bs.modal", () => onShow(ui));
  ui.element.addEventListener("shown.bs.modal", () => onShown(ui));
  ui.element.addEventListener("hide.bs.modal", () => {
    state.phase = "closing";
  });
  ui.element.addEventListener("hidden.bs.modal", () => onHidden(ui));
}
