/**
 * Fechas de negocio en la hora local de Venezuela (America/Caracas, UTC-4 fijo y sin horario de verano desde 2016).
 * En BD las marcas de tiempo se guardan en UTC ISO 8601 (`2026-10-29T03:30:00.000Z`); los filtros por día
 * se traducen a ese rango para que "hoy" sea el día local del negocio y no el de UTC.
 */

/** Zona horaria del negocio. */
export const BUSINESS_TIME_ZONE = "America/Caracas";

/** Desfase de la hora local respecto a UTC, en horas. */
export const BUSINESS_UTC_OFFSET_HOURS = -4;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** ¿Es una fecha de calendario válida con formato `AAAA-MM-DD`? */
export function isLocalDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year = 0, month = 0, day = 0] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function localMidnightUtcMs(localDate: string): number {
  if (!isLocalDate(localDate)) throw new RangeError(`Fecha inválida: ${localDate}`);
  return Date.parse(`${localDate}T00:00:00.000Z`) - BUSINESS_UTC_OFFSET_HOURS * HOUR_MS;
}

/** Instante UTC (ISO) en que empieza el día local: `2026-10-29` -> `2026-10-29T04:00:00.000Z`. */
export function localDayStartUtc(localDate: string): string {
  return new Date(localMidnightUtcMs(localDate)).toISOString();
}

/** Instante UTC (ISO) en que empieza el día local siguiente (límite exclusivo): `2026-10-29` -> `2026-10-30T04:00:00.000Z`. */
export function localDayEndUtc(localDate: string): string {
  return new Date(localMidnightUtcMs(localDate) + DAY_MS).toISOString();
}

/** Día local (`AAAA-MM-DD`) de un instante: a las 23:30 del 28 en Caracas (03:30Z del 29) devuelve `2026-10-28`. */
export function toLocalDate(instant: Date | string | number): string {
  const ms = new Date(instant).getTime();
  if (!Number.isFinite(ms)) throw new RangeError(`Instante inválido: ${String(instant)}`);
  return new Date(ms + BUSINESS_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

/** Atajos de rango de fechas: hoy, esta semana (desde el lunes) y este mes (desde el día 1). */
export type DateRangePreset = "today" | "week" | "month";

/** Rango de días locales (`AAAA-MM-DD`, ambos incluidos) de un atajo, terminando en el día local de `now`. */
export function presetDateRange(
  preset: DateRangePreset,
  now: Date | string | number = Date.now(),
): { from: string; to: string } {
  const to = toLocalDate(now);
  if (preset === "today") return { from: to, to };
  if (preset === "month") return { from: `${to.slice(0, 8)}01`, to };
  const today = new Date(`${to}T00:00:00.000Z`);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return { from: new Date(today.getTime() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10), to };
}
