import { expect, test } from "bun:test";
import { fillDailySales, recentLocalDates } from "./dashboard.service";

test("genera los días hacia atrás incluyendo hoy y cruzando meses", () => {
  expect(recentLocalDates("2026-11-02", 4)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
});

test("rellena con ceros los días sin ventas", () => {
  const sale = { date: "2026-10-28", invoices: 2, total_usd_cents: 500, total_bs_cents: 18_000 };
  const rows = [sale];
  expect(fillDailySales(["2026-10-27", "2026-10-28"], rows)).toEqual([
    { date: "2026-10-27", invoices: 0, total_usd_cents: 0, total_bs_cents: 0 },
    sale,
  ]);
});
