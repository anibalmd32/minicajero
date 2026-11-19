import { describeRateStatus, type ExchangeRateOverview, type RateSource } from "../../exchange-rate";
import { asSentence, formatDateTime, formatRate } from "../../format";
import { elements } from "./elements";

export const SOURCE_LABELS: Record<RateSource, string> = { api: "Oficial", manual: "Manual" };

function metaText(overview: ExchangeRateOverview): string {
  if (overview.rate === null || overview.source === null) return "Sin tasa registrada.";
  const mode = overview.mode === "manual" ? "Modo manual" : "Modo automático";
  const updated = overview.updated_at ? ` · ${formatDateTime(overview.updated_at)}` : "";
  return `${mode} · Origen: ${SOURCE_LABELS[overview.source].toLowerCase()}${updated}`;
}

export function renderOverview(overview: ExchangeRateOverview): void {
  const { statusBadge, currentValue, currentMeta, statusDetail, autoButton } = elements;
  const view = describeRateStatus(overview, navigator.onLine);
  statusBadge.className = `badge rounded-pill text-wrap text-start ${view.badgeClass}`;
  statusBadge.textContent = view.label;
  currentValue.textContent = overview.rate === null ? "—" : `Bs ${formatRate(overview.rate)}`;
  currentMeta.textContent = metaText(overview);
  statusDetail.textContent = asSentence(view.detail);
  statusDetail.className = `small mt-2 ${view.kind === "missing" ? "text-danger" : "text-body-secondary"}`;
  autoButton.classList.toggle("d-none", overview.mode !== "manual");
}
