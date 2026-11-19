import type { LinkState } from "../../phone-link";
import { CONTEXT_TEXTS } from "../../phone-scan/scan-history";
import { renderCamera, stopCameraForGood } from "./camera-controller";
import { isConnected } from "./connection";
import { elements } from "./elements";
import { show } from "./view-utils";

const STALLED_LINK_TEXT = "Revisa que estén en el mismo Wi-Fi o escanea de nuevo el código de la computadora.";

function setBadge(kind: "ok" | "wait" | "lost" | "off", text: string): void {
  elements.badge.className = `phone-badge phone-badge-${kind}`;
  elements.badgeText.textContent = text;
}

function setBanner(kind: "ok" | "idle" | "wait" | "lost", title: string, text: string | null): void {
  elements.banner.className = `phone-banner phone-banner-${kind}`;
  show(elements.bannerSpinner, kind === "wait" || kind === "lost");
  elements.statusText.textContent = title;
  elements.contextText.textContent = text ?? "";
  show(elements.contextText, text !== null);
}

function renderEnded(text: string, reload: boolean): void {
  stopCameraForGood();
  setBadge("off", "Desconectado");
  show(elements.banner, false);
  show(elements.scanner, false);
  elements.endedText.textContent = text;
  show(elements.reloadButton, reload);
  show(elements.endedPanel, true);
}

function renderInputs(): void {
  const connected = isConnected();
  elements.manualCode.disabled = !connected;
  elements.manualSend.disabled = !connected;
  renderCamera();
}

function renderLiveState(state: Exclude<LinkState, { kind: "ended" }>): void {
  if (state.kind === "connecting") {
    setBadge("wait", "Conectando…");
    setBanner("wait", "Conectando…", null);
  } else if (state.kind === "connected") {
    setBadge("ok", "Conectado");
    const hasTarget = state.context !== "ninguno";
    setBanner(hasTarget ? "ok" : "idle", "Conectado", CONTEXT_TEXTS[state.context]);
  } else {
    setBadge("lost", "Sin conexión");
    if (state.stalled) setBanner("lost", "No encontramos la computadora", STALLED_LINK_TEXT);
    else setBanner("lost", "Se perdió la conexión, reintentando…", null);
  }
  renderInputs();
}

export function renderLinkState(state: LinkState): void {
  if (state.kind === "ended") renderEnded(state.text, state.reload);
  else renderLiveState(state);
}
