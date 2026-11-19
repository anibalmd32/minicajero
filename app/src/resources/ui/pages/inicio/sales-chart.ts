import type { DailySales, Dashboard } from "../../dashboard";

import { textElement } from "../../list";
import { dualAmountTexts, formatDualSnapshot } from "../../money";
import {
  capitalize,
  dayMonthFormat,
  invoicesUrl,
  localDate,
  longDateFormat,
  plural,
  weekdayFormat,
} from "./dashboard-text";
import { elements } from "./elements";

const MIN_BAR_PERCENT = 3;

function chartDayLabel(day: DailySales, today: string): string {
  return day.date === today ? "Hoy" : capitalize(weekdayFormat.format(localDate(day.date)).replace(".", ""));
}

function chartDayDescription(day: DailySales): string {
  const { primary, secondary } = dualAmountTexts(day.total_usd_cents, day.total_bs_cents);
  const date = capitalize(longDateFormat.format(localDate(day.date)));
  return `${date}: ${primary} (${secondary}) · ${plural(day.invoices, "factura", "facturas")}`;
}

function barPercent(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(MIN_BAR_PERCENT, Math.round((value / max) * 100));
}

function chartTrack(day: DailySales, max: number): HTMLSpanElement {
  const track = document.createElement("span");
  track.className = "dashboard-chart-track";
  const bar = document.createElement("span");
  bar.className = "dashboard-chart-bar";
  bar.style.height = `${barPercent(day.total_usd_cents, max)}%`;
  track.append(bar);
  return track;
}

function chartBar(day: DailySales, max: number, today: string): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `dashboard-chart-day${day.date === today ? " is-today" : ""}`;
  const link = document.createElement("a");
  link.className = "dashboard-chart-link";
  link.href = invoicesUrl(day.date, day.date);
  link.title = chartDayDescription(day);
  link.setAttribute("aria-label", link.title);
  const amountText = day.invoices === 0 ? "" : dualAmountTexts(day.total_usd_cents, day.total_bs_cents).primary;
  link.append(
    textElement("span", amountText, "dashboard-chart-amount"),
    chartTrack(day, max),
    textElement("span", chartDayLabel(day, today), "dashboard-chart-label"),
    textElement("span", dayMonthFormat.format(localDate(day.date)), "dashboard-chart-date"),
  );
  li.append(link);
  return li;
}

export function renderChart(data: Dashboard): void {
  const days = data.sales_recent_days;
  const max = Math.max(0, ...days.map((day) => day.total_usd_cents));
  elements.chart.replaceChildren(...days.map((day) => chartBar(day, max, data.today)));
  elements.chartEmpty.classList.toggle("d-none", max > 0);
  if (max === 0) {
    elements.chartTotal.textContent = "";
    return;
  }
  const usd = days.reduce((sum, day) => sum + day.total_usd_cents, 0);
  const bs = days.reduce((sum, day) => sum + day.total_bs_cents, 0);
  elements.chartTotal.innerHTML = `Total: ${formatDualSnapshot(usd, bs)}`;
}
