/** Formatos de código de barras que intenta leer el teléfono, en orden de preferencia. */
export const WANTED_BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
] as const;

/** Formatos que se pueden pedir a `BarcodeDetector`: los deseados que el navegador dice soportar. */
export function pickBarcodeFormats(supported: readonly string[]): string[] {
  return WANTED_BARCODE_FORMATS.filter((format) => supported.includes(format));
}

/** Código detectado en un fotograma. */
export interface DetectedCode {
  rawValue: string;
  format: string;
  boundingBox: { width: number; height: number };
}

function area(code: DetectedCode): number {
  return code.boundingBox.width * code.boundingBox.height;
}

/** Elige el código más grande del fotograma (el que está más cerca de la cámara). */
export function pickDetectedCode<T extends DetectedCode>(codes: readonly T[]): T | null {
  let best: T | null = null;
  for (const code of codes) {
    if (!code.rawValue.trim()) continue;
    if (!best || area(code) > area(best)) best = code;
  }
  return best;
}
