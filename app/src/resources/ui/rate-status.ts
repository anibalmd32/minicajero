import type { ExchangeRateOverview } from "./exchange-rate-types";
import { formatDate, formatDateTime, formatTime } from "./format";

/** Situación de la tasa tal como se comunica al usuario. */
export type RateStatusKind = "ok" | "offline" | "stale" | "manual" | "syncing" | "missing";

/** Texto y estilo del aviso de estado de la tasa. */
export interface RateStatusView {
  kind: RateStatusKind;
  /** Texto completo del badge. */
  label: string;
  /** Texto corto del badge para pantallas estrechas. */
  shortLabel: string;
  /** Explicación para el atributo `title` y lectores de pantalla. */
  detail: string;
  /** Clase de color de Bootstrap del badge (`text-bg-*`). */
  badgeClass: string;
}

const OFFLINE_LABEL = "Sin conexión: la tasa podría no estar actualizada";

function lastUpdateText(overview: ExchangeRateOverview): string {
  const updatedAt = overview.status.last_success_at ?? overview.updated_at;
  return updatedAt
    ? `Última actualización: ${formatDateTime(updatedAt)}`
    : "Aún no se ha podido obtener la tasa oficial";
}

function missingRateView(syncing: boolean): RateStatusView {
  return {
    kind: syncing ? "syncing" : "missing",
    label: syncing ? "Obteniendo tasa…" : "Sin tasa",
    shortLabel: syncing ? "Obteniendo…" : "Sin tasa",
    detail: "No hay tasa de cambio disponible. Fija una tasa manual para poder vender",
    badgeClass: syncing ? "text-bg-secondary" : "text-bg-danger",
  };
}

function manualRateView(overview: ExchangeRateOverview): RateStatusView {
  const since = overview.updated_at ? ` (desde ${formatDateTime(overview.updated_at)})` : "";
  return {
    kind: "manual",
    label: "Tasa manual",
    shortLabel: "Manual",
    detail: `Tasa fijada manualmente${since}. No se actualiza sola hasta volver al modo automático`,
    badgeClass: "text-bg-secondary",
  };
}

function offlineRateView(overview: ExchangeRateOverview): RateStatusView {
  return {
    kind: "offline",
    label: OFFLINE_LABEL,
    shortLabel: "Sin conexión",
    detail: `${OFFLINE_LABEL}. ${lastUpdateText(overview)}`,
    badgeClass: "text-bg-warning",
  };
}

function staleRateView(overview: ExchangeRateOverview): RateStatusView {
  return {
    kind: "stale",
    label: "Tasa sin actualizar",
    shortLabel: "Sin actualizar",
    detail: `La tasa no se ha actualizado en más de 6 horas. ${lastUpdateText(overview)}`,
    badgeClass: "text-bg-warning",
  };
}

function currentRateView(overview: ExchangeRateOverview): RateStatusView {
  return {
    kind: "ok",
    label: "Tasa actualizada",
    shortLabel: "Actualizada",
    detail: `Tasa oficial actualizada. ${lastUpdateText(overview)}`,
    badgeClass: "text-bg-success",
  };
}

/**
 * Traduce el estado de la tasa a lo que se muestra al usuario. `browserOnline` es `navigator.onLine`:
 * sin conexión en el navegador o con la última sincronización fallida se avisa que podría no estar actualizada.
 */
export function describeRateStatus(overview: ExchangeRateOverview, browserOnline: boolean): RateStatusView {
  if (overview.rate === null) return missingRateView(overview.status.syncing);
  if (overview.mode === "manual") return manualRateView(overview);
  if (!browserOnline || !overview.status.online) return offlineRateView(overview);
  if (overview.status.stale) return staleRateView(overview);
  return currentRateView(overview);
}

function rateTimeLabel(updatedAt: string): string {
  const updated = new Date(updatedAt);
  const sameDay = updated.toDateString() === new Date().toDateString();
  if (!sameDay) return `tasa del ${formatDate(updated)}`;
  const time = formatTime(updated);
  return `tasa de ${time.startsWith("1:") ? "la" : "las"} ${time}`;
}

/**
 * Aviso breve para acompañar la tasa usada en una venta cuando podría no estar al día
 * (sin conexión o sin actualizar); `null` si está al día, es manual o no hay tasa.
 */
export function rateFreshnessWarning(overview: ExchangeRateOverview | null, browserOnline: boolean): string | null {
  if (!overview || overview.rate === null) return null;
  const { kind } = describeRateStatus(overview, browserOnline);
  if (kind !== "offline" && kind !== "stale") return null;
  const reason = kind === "offline" ? "Sin conexión" : "Sin actualizar";
  const updatedAt = overview.status.last_success_at ?? overview.updated_at;
  return updatedAt ? `${reason} · ${rateTimeLabel(updatedAt)}` : reason;
}
