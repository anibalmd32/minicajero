import { getLastRateOverview, rateFreshnessWarning } from "../../exchange-rate";
import { formatDecimalInput, formatRate } from "../../format";
import { textElement } from "../../list";
import { getCurrentRate } from "../../money";
import { RATE_SETTINGS_URL } from "../../nav-status";
import type { CartTotals } from "../../sale-cart";
import { dualHtml } from "./amounts";
import { state } from "./state";

export function renderTaxRow(row: HTMLElement, label: HTMLElement, value: HTMLElement, totals: CartTotals): void {
  const percent = state.ivaPercent ?? 0;
  row.classList.toggle("d-none", percent <= 0);
  label.textContent = `IVA (${formatDecimalInput(percent)} %)`;
  value.innerHTML = dualHtml(totals.tax_usd_cents, totals.tax_bs_cents);
}

export function renderRate(target: HTMLElement): void {
  const rate = getCurrentRate();
  if (rate !== null) {
    target.className = "pos-rate-used";
    target.replaceChildren(`Tasa usada: Bs ${formatRate(rate)} por $`);
    const warning = rateFreshnessWarning(getLastRateOverview(), navigator.onLine);
    if (warning) target.append(textElement("span", warning, "pos-rate-warning"));
    return;
  }
  target.className = "pos-rate-used text-danger";
  const link = document.createElement("a");
  link.href = RATE_SETTINGS_URL;
  link.textContent = "Fijar tasa manual";
  target.replaceChildren("Sin tasa de cambio. ", link);
}
