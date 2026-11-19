import type { NumberOptions, StringOptions } from "./validation.types";

const limitFormat = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 20, useGrouping: "always" });

function formatLimit(value: number): string {
  return limitFormat.format(value);
}

export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function isBlankString(value: unknown): boolean {
  return isMissing(value) || (typeof value === "string" && value.trim() === "");
}

/** Cantidad de decimales significativos de un número; normaliza con `toPrecision(15)` para ignorar el ruido binario (0.1 + 0.2 -> 1 decimal). */
export function countDecimals(value: number): number {
  if (Number.isInteger(value)) return 0;
  const text = Number(value.toPrecision(15)).toString();
  if (text.includes("e-")) {
    const [mantissa = "", exp = "0"] = text.split("e-");
    return (mantissa.split(".")[1]?.length ?? 0) + Number(exp);
  }
  return text.split(".")[1]?.length ?? 0;
}

export type StringCheck = { value: string } | { error: string };

export function checkString(value: unknown, opts: StringOptions): StringCheck {
  if (typeof value !== "string") return { error: "Debe ser un texto" };
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    return { error: `Debe tener al menos ${opts.min} caracteres` };
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    return { error: `Debe tener como máximo ${opts.max} caracteres` };
  }
  if (opts.pattern && !opts.pattern.test(trimmed)) {
    return { error: opts.patternMessage ?? "Formato inválido" };
  }
  return { value: trimmed };
}

/** Mensaje de error si el número queda fuera de rango, o `null` si es válido. */
export function rangeError(value: number, opts: NumberOptions): string | null {
  if (opts.min !== undefined && value < opts.min) {
    return `Debe ser mayor o igual que ${formatLimit(opts.min)}`;
  }
  if (opts.max !== undefined && value > opts.max) {
    return `Debe ser menor o igual que ${formatLimit(opts.max)}`;
  }
  return null;
}
