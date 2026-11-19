import { describeRateStatus, type ExchangeRateOverview, type RateStatusView } from "./exchange-rate";
import { asSentence, formatRate } from "./format";
import type { DisplayCurrency } from "./settings";

/** Ruta de la sección de gestión de la tasa. */
export const RATE_SETTINGS_URL = "/configuracion#tasa";

const BANNER_ID = "app-rate-banner";
const CURRENCY_INPUT_NAME = "app-display-currency";

export const LOADING_VIEW: RateStatusView = {
  kind: "syncing",
  label: "Consultando tasa…",
  shortLabel: "Consultando…",
  detail: "Consultando la tasa de cambio vigente",
  badgeClass: "text-bg-secondary",
};

export const UNREACHABLE_VIEW: RateStatusView = {
  kind: "missing",
  label: "Tasa no disponible",
  shortLabel: "No disponible",
  detail: "No se pudo consultar la tasa con el servidor de MiniCajero",
  badgeClass: "text-bg-danger",
};

export interface NavStatusParts {
  indicator: HTMLAnchorElement;
  rateValue: HTMLElement;
  badge: HTMLElement;
  badgeLong: HTMLElement;
  badgeShort: HTMLElement;
  currencyInputs: HTMLInputElement[];
}

function requirePart<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const part = root.querySelector<T>(`[data-role="${role}"]`);
  if (!part) throw new Error(`Falta el elemento "${role}" del indicador de tasa`);
  return part;
}

export function renderSkeleton(slot: HTMLElement): NavStatusParts {
  slot.innerHTML = `
    <a class="nav-rate link-light link-underline-opacity-0 link-underline-opacity-75-hover" data-role="indicator" href="${RATE_SETTINGS_URL}">
      <span class="nav-rate-value" data-role="rate-value"></span>
      <span class="badge rounded-pill nav-rate-badge" data-role="badge">
        <span class="nav-rate-badge-long" data-role="badge-long"></span>
        <span class="nav-rate-badge-short" data-role="badge-short" aria-hidden="true"></span>
      </span>
    </a>
    <div class="btn-group btn-group-sm nav-currency" role="group" aria-label="Moneda principal en pantalla">
      <input type="radio" class="btn-check" name="${CURRENCY_INPUT_NAME}" id="${CURRENCY_INPUT_NAME}-usd" value="USD" autocomplete="off">
      <label class="btn btn-outline-light" for="${CURRENCY_INPUT_NAME}-usd" title="Mostrar dólares como moneda principal">USD</label>
      <input type="radio" class="btn-check" name="${CURRENCY_INPUT_NAME}" id="${CURRENCY_INPUT_NAME}-ves" value="VES" autocomplete="off">
      <label class="btn btn-outline-light" for="${CURRENCY_INPUT_NAME}-ves" title="Mostrar bolívares como moneda principal">Bs</label>
    </div>`;
  return {
    indicator: requirePart(slot, "indicator"),
    rateValue: requirePart(slot, "rate-value"),
    badge: requirePart(slot, "badge"),
    badgeLong: requirePart(slot, "badge-long"),
    badgeShort: requirePart(slot, "badge-short"),
    currencyInputs: [...slot.querySelectorAll<HTMLInputElement>(`input[name="${CURRENCY_INPUT_NAME}"]`)],
  };
}

function rateText(rate: number | null): string {
  return rate === null ? "Bs — / $" : `Bs ${formatRate(rate)} / $`;
}

export function renderIndicator(parts: NavStatusParts, view: RateStatusView, rate: number | null): void {
  parts.rateValue.textContent = rateText(rate);
  parts.badge.className = `badge rounded-pill nav-rate-badge ${view.badgeClass}`;
  parts.badge.dataset.status = view.kind;
  parts.badgeLong.textContent = view.label;
  parts.badgeShort.textContent = view.shortLabel;
  parts.indicator.title = `${asSentence(view.detail)} Clic para gestionar la tasa.`;
  parts.indicator.setAttribute(
    "aria-label",
    `Tasa ${rateText(rate)}. ${asSentence(view.detail)} Gestionar la tasa de cambio.`,
  );
}

function renderBanner(visible: boolean): void {
  const existing = document.getElementById(BANNER_ID);
  if (!visible) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const banner = document.createElement("div");
  banner.id = BANNER_ID;
  banner.className =
    "alert alert-danger rounded-0 border-0 border-bottom border-danger-subtle mb-0 py-2 app-rate-banner";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
    <div class="container d-flex flex-wrap align-items-center justify-content-between gap-2">
      <span><strong>No hay tasa de cambio.</strong> No se pudo obtener la tasa oficial; fija una tasa manual para poder vender.</span>
      <a class="btn btn-sm btn-danger" href="${RATE_SETTINGS_URL}">Fijar tasa manual</a>
    </div>`;
  document.getElementById("app-nav")?.after(banner);
}

export function renderOverview(parts: NavStatusParts, overview: ExchangeRateOverview): void {
  renderIndicator(parts, describeRateStatus(overview, navigator.onLine), overview.rate);
  renderBanner(overview.rate === null && !overview.status.syncing);
}

export function renderCurrency(parts: NavStatusParts, currency: DisplayCurrency): void {
  for (const input of parts.currencyInputs) input.checked = input.value === currency;
}
