import { encodeQr, type QrCode } from "./encode";
import { matrixToSvg, type QrSvgOptions } from "./svg";

export { type QrCode, QrTooLongError } from "./encode";
export type { QrSvgOptions } from "./svg";

/**
 * Codifica `text` (modo byte, UTF-8) en un código QR con corrección M, o L si no cabe,
 * en la versión más pequeña posible y con la máscara de menor penalización.
 * Lanza `QrTooLongError` si el texto no cabe.
 */
export function qrMatrix(text: string): QrCode {
  return encodeQr(text);
}

/** Código QR de `text` como SVG escalable (por defecto con margen de 4 módulos y fondo blanco). Lanza `QrTooLongError` si no cabe. */
export function qrToSvg(text: string, options?: QrSvgOptions): string {
  return matrixToSvg(qrMatrix(text).modules, options);
}
