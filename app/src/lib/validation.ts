import { BadRequestError, type ErrorDetails } from "./http-errors";
import type { JsonObject } from "./request";
import type { DecimalOptions, NumberOptions, StringOptions } from "./validation.types";
import { checkString, countDecimals, isBlankString, isMissing, rangeError } from "./validation-checks";

export { countDecimals } from "./validation-checks";

const REQUIRED_MESSAGE = "Este campo es obligatorio";

/**
 * Valida campos de un objeto JSON acumulando errores por campo.
 *
 * Uso:
 * ```ts
 * const v = new Validator(body);
 * const nombre = v.requiredString("nombre", { max: 100 });
 * const stock = v.integer("stock", { min: 0 });
 * v.assertValid(); // lanza 400 { error, details } si hubo errores
 * ```
 * Si un campo es inválido el método devuelve un valor de relleno; no lo uses antes de `assertValid()`.
 */
export class Validator {
  private readonly errors: ErrorDetails = {};

  constructor(private readonly data: JsonObject) {}

  get hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /** Registra un error manual (solo el primero por campo). */
  addError(field: string, message: string): void {
    if (!(field in this.errors)) this.errors[field] = message;
  }

  /** Lanza BadRequestError con los detalles si hay errores. */
  assertValid(message = "Hay datos inválidos en el formulario"): void {
    if (this.hasErrors) throw new BadRequestError(message, { ...this.errors });
  }

  /** ¿El campo viene informado? (`undefined`, `null` y "" cuentan como ausente). */
  has(field: string): boolean {
    return !isMissing(this.data[field]);
  }

  requiredString(field: string, opts: StringOptions = {}): string {
    const value = this.data[field];
    if (isBlankString(value)) {
      this.addError(field, REQUIRED_MESSAGE);
      return "";
    }
    return this.stringOrNull(field, value, { min: 1, ...opts }) ?? "";
  }

  /** Cadena opcional: vacía o ausente devuelve `null`. */
  optionalString(field: string, opts: StringOptions = {}): string | null {
    const value = this.data[field];
    if (isBlankString(value)) return null;
    return this.stringOrNull(field, value, opts);
  }

  integer(field: string, opts: NumberOptions & { optional: true }): number | null;
  integer(field: string, opts?: NumberOptions & { optional?: false }): number;
  integer(field: string, opts: NumberOptions & { optional?: boolean } = {}): number | null {
    const value = this.data[field];
    if (isMissing(value)) return this.missing(field, opts.optional, 0);
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      return this.invalid(field, "Debe ser un número entero", 0);
    }
    return this.inRange(field, value, opts) ? value : 0;
  }

  /** Número finito >= 0 (o >= `min` si se indica), con límite opcional de decimales. */
  nonNegativeNumber(field: string, opts: DecimalOptions & { optional: true }): number | null;
  nonNegativeNumber(field: string, opts?: DecimalOptions & { optional?: false }): number;
  nonNegativeNumber(field: string, opts: DecimalOptions & { optional?: boolean } = {}): number | null {
    const value = this.data[field];
    if (isMissing(value)) return this.missing(field, opts.optional, 0);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return this.invalid(field, "Debe ser un número", 0);
    }
    if (!this.inRange(field, value, { ...opts, min: Math.max(0, opts.min ?? 0) })) return 0;
    if (opts.maxDecimals !== undefined && countDecimals(value) > opts.maxDecimals) {
      return this.invalid(field, `Admite como máximo ${opts.maxDecimals} decimales`, 0);
    }
    return value;
  }

  oneOf<const T extends string>(field: string, allowed: readonly T[], opts: { optional: true }): T | null;
  oneOf<const T extends string>(field: string, allowed: readonly T[], opts?: { optional?: false }): T;
  oneOf<const T extends string>(field: string, allowed: readonly T[], opts: { optional?: boolean } = {}): T | null {
    const value = this.data[field];
    const fallback = allowed[0] as T;
    if (isMissing(value)) return this.missing(field, opts.optional, fallback);
    if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
      return this.invalid(field, `Valor no permitido. Opciones: ${allowed.join(", ")}`, fallback);
    }
    return value as T;
  }

  boolean(field: string, opts: { optional: true }): boolean | null;
  boolean(field: string, opts?: { optional?: false }): boolean;
  boolean(field: string, opts: { optional?: boolean } = {}): boolean | null {
    const value = this.data[field];
    if (isMissing(value)) return this.missing(field, opts.optional, false);
    if (typeof value !== "boolean") return this.invalid(field, "Debe ser verdadero o falso", false);
    return value;
  }

  private missing<T>(field: string, optional: boolean | undefined, fallback: T): T | null {
    if (optional) return null;
    this.addError(field, REQUIRED_MESSAGE);
    return fallback;
  }

  private invalid<T>(field: string, message: string, fallback: T): T {
    this.addError(field, message);
    return fallback;
  }

  private stringOrNull(field: string, value: unknown, opts: StringOptions): string | null {
    const result = checkString(value, opts);
    if ("error" in result) {
      this.addError(field, result.error);
      return null;
    }
    return result.value;
  }

  private inRange(field: string, value: number, opts: NumberOptions): boolean {
    const error = rangeError(value, opts);
    if (error) this.addError(field, error);
    return error === null;
  }
}
