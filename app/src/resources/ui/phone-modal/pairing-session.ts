import { PAIRING_TOKEN_PARAM } from "../../../modules/phone/phone.protocol";
import type { PairingInfo } from "../../../modules/phone/phone.service";
import { api, errorMessage } from "../api";
import type { ModalParts } from "./modal-parts";
import { isOpen, state } from "./modal-state";
import { renderNetworks } from "./network-select";
import { renderQr, renderWaiting, showError, showLoading } from "./pairing-view";

const RENEW_BEFORE_EXPIRY_MS = 5000;

function pairingToken(info: PairingInfo): string {
  const fragment = new URL(info.urls[0]?.url ?? "about:blank").hash.slice(1);
  return new URLSearchParams(fragment).get(PAIRING_TOKEN_PARAM) ?? "";
}

export function cancelUnusedPairing(info: PairingInfo | null): void {
  if (!info) return;
  api.post("/phone/pairing/cancel", { token: pairingToken(info) }).catch((err: unknown) => console.error(err));
}

function scheduleRenewal(ui: ModalParts, info: PairingInfo): void {
  window.clearTimeout(state.renewTimer);
  const wait = Math.max(1000, new Date(info.expires_at).getTime() - Date.now() - RENEW_BEFORE_EXPIRY_MS);
  state.renewTimer = window.setTimeout(() => {
    if (isOpen()) void loadPairing(ui, false);
  }, wait);
}

export async function loadPairing(ui: ModalParts, showSpinner: boolean): Promise<void> {
  const request = ++state.pairingRequest;
  if (showSpinner) showLoading(ui);
  try {
    const info = await api.post<PairingInfo>("/phone/pairing");
    if (request !== state.pairingRequest || !isOpen()) {
      cancelUnusedPairing(info);
      return;
    }
    state.pairing = info;
    ui.error.classList.add("d-none");
    ui.pair.classList.remove("d-none");
    renderNetworks(ui, info);
    renderQr(ui);
    renderWaiting(ui);
    scheduleRenewal(ui, info);
  } catch (err) {
    if (request !== state.pairingRequest || !isOpen()) return;
    showError(ui, errorMessage(err));
    ui.retry.focus();
  }
}
