import { formatInteger, LOCALE } from "../../format";

export const longDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });
export const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" });
export const dayMonthFormat = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function localDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : pluralForm}`;
}

export function invoicesUrl(from: string, to: string): string {
  return `/facturas?${new URLSearchParams({ desde: from, hasta: to }).toString()}`;
}
