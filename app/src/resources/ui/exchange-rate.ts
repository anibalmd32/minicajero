import { api } from "./api";
import type { ExchangeRateHistory, ExchangeRateOverview, RateMode } from "./exchange-rate-types";
import { RATE_OVERVIEW_EVENT } from "./exchange-rate-types";
import { formatRate } from "./format";
import { applyCurrentRate } from "./money";
import { showToast, toastSuccess } from "./toast";

export type {
  ExchangeRateHistory,
  ExchangeRateOverview,
  ExchangeRateRecord,
  RateMode,
  RateSource,
  RateSyncStatus,
} from "./exchange-rate-types";
export { RATE_OVERVIEW_EVENT } from "./exchange-rate-types";
export { describeRateStatus, type RateStatusKind, type RateStatusView, rateFreshnessWarning } from "./rate-status";

let lastOverview: ExchangeRateOverview | null = null;

/** Último estado de tasa recibido del servidor en esta página (o `null` si aún no se ha cargado). */
export function getLastRateOverview(): ExchangeRateOverview | null {
  return lastOverview;
}

/** Difunde a toda la página un estado de tasa recibido del servidor (actualiza la tasa vigente del cliente). */
export function publishRateOverview(overview: ExchangeRateOverview): ExchangeRateOverview {
  lastOverview = overview;
  applyCurrentRate(overview.rate);
  window.dispatchEvent(new CustomEvent<ExchangeRateOverview>(RATE_OVERVIEW_EVENT, { detail: overview }));
  return overview;
}

/** Consulta la tasa vigente y su estado, y lo difunde a toda la página. */
export async function loadRateOverview(): Promise<ExchangeRateOverview> {
  return publishRateOverview(await api.get<ExchangeRateOverview>("/exchange-rate"));
}

/** Fuerza la sincronización con la tasa oficial y difunde el resultado. */
export async function refreshRate(): Promise<ExchangeRateOverview> {
  return publishRateOverview(await api.post<ExchangeRateOverview>("/exchange-rate/refresh"));
}

/** Fija una tasa manual (pasa a modo manual) y difunde el resultado. `rate` se envía tal cual para que el servidor lo valide. */
export async function saveManualRate(rate: unknown): Promise<ExchangeRateOverview> {
  return publishRateOverview(await api.put<ExchangeRateOverview>("/exchange-rate/manual", { rate }));
}

/** Cambia el modo de tasa y difunde el resultado. */
export async function changeRateMode(mode: RateMode): Promise<ExchangeRateOverview> {
  return publishRateOverview(await api.put<ExchangeRateOverview>("/exchange-rate/mode", { mode }));
}

/** Página del historial de tasas, de la más reciente a la más antigua. */
export function fetchRateHistory(limit: number, offset: number): Promise<ExchangeRateHistory> {
  return api.get<ExchangeRateHistory>("/exchange-rate/history", { limit, offset });
}

/** Avisa con un toast del resultado de forzar la sincronización de la tasa oficial. */
export function reportRateRefresh(overview: ExchangeRateOverview): void {
  if (!overview.status.online) {
    const reason = overview.status.last_error ? ` ${overview.status.last_error}.` : "";
    showToast(`No se pudo actualizar la tasa oficial.${reason} Revisa la conexión a internet.`, "warning");
    return;
  }
  if (overview.mode === "manual") {
    toastSuccess("Tasa oficial sincronizada. Sigues usando la tasa manual hasta que vuelvas a la automática.");
    return;
  }
  toastSuccess(`Tasa oficial actualizada: Bs ${formatRate(overview.rate ?? Number.NaN)}`);
}
