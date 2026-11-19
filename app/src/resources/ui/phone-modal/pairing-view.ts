import type { ModalParts } from "./modal-parts";
import { state } from "./modal-state";

function showHelpIp(ui: ModalParts, ip: string): void {
  for (const node of ui.element.querySelectorAll("[data-role=help-ip]")) node.textContent = ip;
}

export function renderQr(ui: ModalParts): void {
  const { pairing } = state;
  if (!pairing) return;
  const selected = pairing.urls.find((url) => url.ip === ui.network.value) ?? pairing.urls[0];
  ui.qr.innerHTML = selected?.qr_svg ?? "";
  ui.qr.classList.remove("is-loading");
  if (selected) showHelpIp(ui, selected.ip);
}

export function renderWaiting(ui: ModalParts): void {
  ui.status.className = "phone-pair-status text-body-secondary";
  const spinner = document.createElement("span");
  spinner.className = "spinner-grow spinner-grow-sm text-primary me-2";
  spinner.setAttribute("aria-hidden", "true");
  const text = state.phones.length > 0 ? "Esperando otro teléfono…" : "Esperando al teléfono…";
  ui.status.replaceChildren(spinner, text);
}

export function renderConnected(ui: ModalParts): void {
  ui.status.className = "phone-pair-status text-success fw-semibold";
  ui.status.textContent = "Teléfono conectado ✓";
}

export function showLoading(ui: ModalParts): void {
  ui.error.classList.add("d-none");
  ui.pair.classList.remove("d-none");
  ui.qr.classList.add("is-loading");
  ui.qr.innerHTML = `<span class="spinner-border text-secondary" aria-hidden="true"></span><span class="visually-hidden">Preparando el código…</span>`;
  ui.status.textContent = "";
}

export function showError(ui: ModalParts, message: string): void {
  ui.pair.classList.add("d-none");
  ui.status.textContent = "";
  ui.errorText.textContent = message;
  ui.error.classList.remove("d-none");
}
