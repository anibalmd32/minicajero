import { BarcodeCamera, cameraSupportProblem } from "../../phone-camera";
import { CAMERA_PROBLEM_TEXTS, type CameraProblem, canRetryCamera } from "../../phone-scan/camera-problems";
import { isConnected } from "./connection";
import { elements } from "./elements";
import { dedup, handleCameraRead } from "./scan-sender";
import { show } from "./view-utils";

let cameraWanted = false;
let cameraProblem: CameraProblem | null = null;

export const camera = new BarcodeCamera({
  video: elements.video,
  onRead: handleCameraRead,
  canRead: () => isConnected() && !document.hidden,
});

function renderRunningCamera(): void {
  const { cameraOverlay, guide, cameraHint, torchButton } = elements;
  show(cameraOverlay, false);
  show(guide, true);
  show(cameraHint, true);
  guide.classList.toggle("is-waiting", !isConnected());
  cameraHint.textContent = isConnected() ? "Apunta al código de barras" : "Esperando la conexión…";
  show(torchButton, camera.hasTorch);
  torchButton.setAttribute("aria-pressed", String(camera.torchEnabled));
}

function renderStoppedCamera(): void {
  const { cameraOverlay, guide, cameraHint, torchButton, cameraSpinner, cameraMessage, cameraStart } = elements;
  show(cameraOverlay, true);
  show(guide, false);
  show(cameraHint, false);
  guide.classList.toggle("is-waiting", false);
  cameraHint.textContent = isConnected() ? "Apunta al código de barras" : "Esperando la conexión…";
  show(torchButton, false);
  torchButton.setAttribute("aria-pressed", String(camera.torchEnabled));
  const starting = cameraWanted && cameraProblem === null;
  show(cameraSpinner, starting);
  if (starting) {
    cameraMessage.textContent = "Abriendo la cámara…";
    show(cameraStart, false);
  } else if (cameraProblem) {
    cameraMessage.textContent = CAMERA_PROBLEM_TEXTS[cameraProblem];
    cameraStart.textContent = "Reintentar";
    show(cameraStart, canRetryCamera(cameraProblem));
  } else {
    cameraMessage.textContent = "Usa la cámara para leer los códigos de barras.";
    cameraStart.textContent = "Activar cámara";
    show(cameraStart, true);
  }
}

export function renderCamera(): void {
  if (camera.running) renderRunningCamera();
  else renderStoppedCamera();
}

export async function startCamera(): Promise<void> {
  cameraWanted = true;
  cameraProblem = null;
  renderCamera();
  const problem = await camera.start();
  if (!cameraWanted) {
    camera.stop();
    return;
  }
  cameraProblem = problem;
  if (problem) cameraWanted = false;
  renderCamera();
}

export function pauseCamera(): void {
  camera.stop();
  dedup.reset();
  renderCamera();
}

export function stopCameraForGood(): void {
  cameraWanted = false;
  camera.stop();
}

export function resumeCameraIfWanted(): void {
  if (cameraWanted && !camera.running) void startCamera();
}

export async function setUpCamera(): Promise<void> {
  const problem = await cameraSupportProblem();
  if (problem) cameraProblem = problem;
  renderCamera();
}
