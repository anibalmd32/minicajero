import type { DailySalesRow } from "./dashboard.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días locales (`AAAA-MM-DD`) desde `days - 1` días antes de `today` hasta `today`, en orden. */
export function recentLocalDates(today: string, days: number): string[] {
  const end = Date.parse(`${today}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) =>
    new Date(end - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
  );
}

/** Completa con ceros los días sin ventas para que la serie tenga un punto por día. */
export function fillDailySales(dates: readonly string[], rows: readonly DailySalesRow[]): DailySalesRow[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return dates.map((date) => byDate.get(date) ?? { date, invoices: 0, total_usd_cents: 0, total_bs_cents: 0 });
}
