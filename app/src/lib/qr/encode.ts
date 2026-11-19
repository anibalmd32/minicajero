import { encodeCodewords, fitsIn } from "./codewords";
import { MASK_PATTERNS, type MaskPattern, QrGrid } from "./matrix";
import { type ErrorCorrectionLevel, MAX_VERSION, MIN_VERSION } from "./tables";

/** Código QR terminado: `modules[fila][columna]` es `true` si el módulo es oscuro (sin margen). */
export interface QrCode {
  version: number;
  errorCorrection: ErrorCorrectionLevel;
  mask: MaskPattern;
  size: number;
  modules: boolean[][];
}

/** Opciones para forzar la codificación (pensadas para pruebas): niveles a intentar en orden, versión exacta y máscara. */
export interface EncodeOptions {
  levels?: readonly ErrorCorrectionLevel[];
  version?: number;
  mask?: MaskPattern;
}

/** El texto no cabe en ningún código QR con los niveles de corrección permitidos. */
export class QrTooLongError extends Error {
  constructor(readonly byteLength: number) {
    super(`El texto es demasiado largo para un código QR (${byteLength} bytes).`);
    this.name = "QrTooLongError";
  }
}

const DEFAULT_LEVELS: readonly ErrorCorrectionLevel[] = ["M", "L"];

function chooseVersion(bytes: Uint8Array, options: EncodeOptions): { version: number; level: ErrorCorrectionLevel } {
  const levels = options.levels ?? DEFAULT_LEVELS;
  const versions = options.version
    ? [options.version]
    : Array.from({ length: MAX_VERSION }, (_, index) => index + MIN_VERSION);
  for (const level of levels) {
    for (const version of versions) {
      if (fitsIn(bytes, version, level)) return { version, level };
    }
  }
  throw new QrTooLongError(bytes.length);
}

/** Codifica `text` en modo byte (UTF-8) en la versión más pequeña donde quepa con el primer nivel posible (por defecto M y, si no cabe, L). */
export function encodeQr(text: string, options: EncodeOptions = {}): QrCode {
  if (
    options.version !== undefined &&
    !(Number.isInteger(options.version) && options.version >= MIN_VERSION && options.version <= MAX_VERSION)
  ) {
    throw new RangeError(`Versión de QR no válida: ${options.version}`);
  }
  if (options.mask !== undefined && !MASK_PATTERNS.includes(options.mask)) {
    throw new RangeError(`Máscara de QR no válida: ${options.mask}`);
  }
  const bytes = new TextEncoder().encode(text);
  const { version, level } = chooseVersion(bytes, options);
  const grid = new QrGrid(version);
  grid.placeCodewords(encodeCodewords(bytes, version, level));
  const mask = grid.finish(level, options.mask);
  return { version, errorCorrection: level, mask, size: grid.size, modules: grid.dark };
}
