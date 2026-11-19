import { PAIRING_TOKEN_PARAM } from "../../../../modules/phone/phone.protocol";
import { storedPhoneSession } from "../../phone-link";
import { camera, pauseCamera, renderCamera, resumeCameraIfWanted, setUpCamera, startCamera } from "./camera-controller";
import { bindLinkHandlers, link } from "./connection";
import { elements } from "./elements";
import { renderLinkState } from "./link-view";
import { setManualError, submitManual, toggleKeyboard } from "./manual-entry";
import { feedback } from "./scan-feedback";
import { renderHistory } from "./scan-history-view";
import { handleDrop, handleResult } from "./scan-sender";
import { show } from "./view-utils";

function askDisconnect(asking: boolean): void {
  const { disconnectAsk, disconnectConfirm, disconnectNo } = elements;
  show(disconnectAsk, !asking);
  show(disconnectConfirm, asking);
  (asking ? disconnectNo : disconnectAsk).focus();
  if (asking) disconnectConfirm.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function takeTokenFromUrl(): string | null {
  const token = new URLSearchParams(location.hash.slice(1)).get(PAIRING_TOKEN_PARAM);
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  return token;
}

function handleVisibility(): void {
  if (document.hidden) {
    if (camera.running) pauseCamera();
    return;
  }
  link.retryNow();
  resumeCameraIfWanted();
}

function bindCameraControls(): void {
  elements.cameraStart.addEventListener("click", () => {
    feedback.unlock();
    void startCamera();
  });
  elements.torchButton.addEventListener("click", async () => {
    await camera.toggleTorch();
    renderCamera();
  });
}

function bindManualEntry(): void {
  elements.manualForm.addEventListener("submit", submitManual);
  elements.manualCode.addEventListener("input", () => setManualError(null));
  elements.keyboardToggle.addEventListener("click", toggleKeyboard);
}

function bindDisconnect(): void {
  elements.disconnectAsk.addEventListener("click", () => askDisconnect(true));
  elements.disconnectNo.addEventListener("click", () => askDisconnect(false));
  elements.disconnectYes.addEventListener("click", () => link.disconnect());
  elements.reloadButton.addEventListener("click", () => location.reload());
}

function bindPageEvents(): void {
  document.addEventListener("pointerdown", () => feedback.unlock(), { capture: true });
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("online", () => link.retryNow());
  window.addEventListener("pagehide", () => camera.stop());
}

bindLinkHandlers({ onState: renderLinkState, onResult: handleResult, onDrop: handleDrop });
bindCameraControls();
bindManualEntry();
bindDisconnect();
bindPageEvents();
renderHistory();
void setUpCamera();
link.start(takeTokenFromUrl() ?? storedPhoneSession());
