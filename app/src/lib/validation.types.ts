export interface StringOptions {
  /** Longitud mínima tras recortar espacios (por defecto 1 en requeridos). */
  min?: number;
  /** Longitud máxima tras recortar espacios. */
  max?: number;
  /** Patrón que debe cumplir el valor recortado. */
  pattern?: RegExp;
  /** Mensaje si no cumple `pattern`. */
  patternMessage?: string;
}

export interface NumberOptions {
  min?: number;
  max?: number;
}

export interface DecimalOptions extends NumberOptions {
  /** Máximo de decimales permitidos (p. ej. 2 para montos, 4 para tasas). */
  maxDecimals?: number;
}
