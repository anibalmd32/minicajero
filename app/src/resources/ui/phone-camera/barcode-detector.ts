import { type DetectedCode, pickBarcodeFormats } from "../phone-scan/barcode-formats";
import type { CameraProblem } from "../phone-scan/camera-problems";

export interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>;
}

interface BarcodeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

function barcodeDetectorClass(): BarcodeDetectorClass | null {
  const candidate = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

export async function createDetector(): Promise<BarcodeDetectorInstance | null> {
  const Detector = barcodeDetectorClass();
  if (!Detector) return null;
  try {
    const formats = pickBarcodeFormats(await Detector.getSupportedFormats());
    return formats.length > 0 ? new Detector({ formats }) : null;
  } catch {
    return null;
  }
}

/** Comprueba si este navegador puede usar la cámara y leer códigos de barras; devuelve el problema si no. */
export async function cameraSupportProblem(): Promise<CameraProblem | null> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return "insecure";
  return (await createDetector()) ? null : "unsupported";
}
