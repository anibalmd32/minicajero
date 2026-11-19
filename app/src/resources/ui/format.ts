/** Locale de formato de toda la app. */
export const LOCALE = "es-VE";

const amountFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

const rateFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
  useGrouping: "always",
});

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0, useGrouping: "always" });

const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });

const EMPTY_VALUE = "—";

function formatCents(cents: number, symbol: string): string {
  if (!Number.isFinite(cents)) return EMPTY_VALUE;
  const sign = cents < 0 ? "-" : "";
  return `${sign}${symbol} ${amountFormat.format(Math.abs(cents) / 100)}`;
}

/** Centavos USD -> `$ 1.234,56`. */
export function formatUsd(cents: number): string {
  return formatCents(cents, "$");
}

/** Céntimos Bs -> `Bs 8.888,91`. */
export function formatBs(cents: number): string {
  return formatCents(cents, "Bs");
}

/** Tasa Bs/USD con 2 a 4 decimales: `36,5025`. */
export function formatRate(rate: number): string {
  return Number.isFinite(rate) ? rateFormat.format(rate) : EMPTY_VALUE;
}

/** Entero con separador de miles: `1.250`. */
export function formatInteger(value: number): string {
  return Number.isFinite(value) ? integerFormat.format(value) : EMPTY_VALUE;
}

function parseDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha ISO -> `29/10/2026` en hora local. */
export function formatDate(value: string | Date): string {
  const date = parseDate(value);
  return date ? dateFormat.format(date) : EMPTY_VALUE;
}

function unbreakableTime(date: Date): string {
  return timeFormat.format(date).replace(/\s/g, "\u00A0");
}

/** Hora local de una fecha ISO: `2:30 p. m.`, con espacios de no separación para que no se parta en dos líneas. */
export function formatTime(value: string | Date): string {
  const date = parseDate(value);
  return date ? unbreakableTime(date) : EMPTY_VALUE;
}

/** Fecha y hora local: `29/10/2026 2:30 p. m.`. */
export function formatDateTime(value: string | Date): string {
  const date = parseDate(value);
  return date ? `${dateFormat.format(date)} ${unbreakableTime(date)}` : EMPTY_VALUE;
}

const decimalInputFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 4, useGrouping: false });

/** Número para un campo de texto editable, con coma decimal y sin separador de miles: `16,5`. */
export function formatDecimalInput(value: number): string {
  return Number.isFinite(value) ? decimalInputFormat.format(value) : "";
}

/**
 * Interpreta lo que el usuario escribe en un campo numérico. Acepta coma o punto decimal
 * (`16,5`, `16.5`) y miles con punto si hay coma (`1.234,5`). Devuelve `null` si está vacío
 * y `NaN` si no es un número.
 */
export function parseDecimalInput(text: string): number | null {
  const compact = text.trim().replace(/\s+/g, "");
  if (compact === "") return null;
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  return /^-?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

const centsInputFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** Centavos -> monto editable con coma decimal y sin miles: `1050` -> `10,50`. */
export function formatCentsInput(cents: number): string {
  return Number.isFinite(cents) ? centsInputFormat.format(cents / 100) : "";
}

const AMBIGUOUS_THOUSANDS = /^\d{1,3}(\.\d{3})+$/;

/** ¿El texto usa solo puntos en grupos de tres (`1.050`)? Puede ser miles o decimales, así que conviene pedir coma decimal. */
export function isAmbiguousThousands(text: string): boolean {
  return AMBIGUOUS_THOUSANDS.test(text.replace(/\s+/g, ""));
}

/**
 * Interpreta un entero escrito por el usuario, admitiendo puntos de miles (`1.250`).
 * Devuelve `null` si está vacío y `NaN` si no es un entero.
 */
export function parseIntegerInput(text: string): number | null {
  const compact = text.trim().replace(/\s+/g, "");
  if (compact === "") return null;
  const digits = AMBIGUOUS_THOUSANDS.test(compact) ? compact.replace(/\./g, "") : compact;
  return /^-?\d+$/.test(digits) ? Number(digits) : NaN;
}

/**
 * Valor de un campo numérico listo para enviar a la API: el número si se pudo interpretar,
 * el texto original si no (para que el servidor explique el error) o `null` si está vacío.
 */
export function numberForRequest(parsed: number | null, text: string): number | string | null {
  return parsed !== null && Number.isNaN(parsed) ? text : parsed;
}

/** Añade un punto final al texto si no termina ya en punto (evita `p. m..`). */
export function asSentence(text: string): string {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}
