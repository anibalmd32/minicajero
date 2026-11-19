import { errorMessage } from "../../api";
import { describeRateStatus, type ExchangeRateOverview, refreshRate, reportRateRefresh } from "../../exchange-rate";
import { withBusyButton } from "../../form";
import { asSentence, formatDateTime, formatRate } from "../../format";
import { toastError } from "../../toast";
import { dashboardState } from "./dashboard-state";
import { elements } from "./elements";

function rateMetaText(overview: ExchangeRateOverview): string {
  if (overview.rate === null) return "Sin tasa registrada";
  const mode = overview.mode === "manual" ? "Tasa manual" : "Tasa oficial";
  return overview.updated_at ? `${mode} · ${formatDateTime(overview.updated_at)}` : mode;
}

export function renderRate(overview: ExchangeRateOverview): void {
  const view = describeRateStatus(overview, navigator.onLine);
  elements.rateBadge.className = `badge rounded-pill text-wrap text-start ${view.badgeClass}`;
  elements.rateBadge.textContent = view.shortLabel;
  elements.rateBadge.title = view.label;
  elements.rateValue.textContent = overview.rate === null ? "Sin tasa" : `Bs ${formatRate(overview.rate)} / $`;
  elements.rateMeta.textContent = rateMetaText(overview);
  elements.rateDetail.textContent = asSentence(view.detail);
  elements.rateDetail.className = `small mb-3 ${view.kind === "missing" ? "text-danger" : "text-body-secondary"}`;
  const missing = overview.rate === null;
  elements.rateManageLink.textContent = missing ? "Fijar tasa manual" : "Gestionar tasa";
  elements.rateManageLink.className = `btn btn-sm ${missing ? "btn-danger" : "btn-outline-secondary"}`;
  if (dashboardState.current) elements.setupRateAlert.classList.toggle("d-none", !missing);
}

export async function onRefreshRate(): Promise<void> {
  try {
    reportRateRefresh(await withBusyButton(elements.rateRefreshButton, refreshRate, "Actualizando…"));
  } catch (err) {
    toastError(errorMessage(err));
  }
}
