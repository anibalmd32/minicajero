import type { Database } from "bun:sqlite";
import type { Pagination } from "../../lib/request";
import type { OfficialRateFetcher } from "./dolar-api.client";
import type { ExchangeRateRow, RateSource } from "./exchange-rates.repository";

/** Modos de tasa: `auto` usa la tasa oficial sincronizada; `manual`, la fijada por el operador. */
export const RATE_MODES = ["auto", "manual"] as const;
export type RateMode = (typeof RATE_MODES)[number];

/** Antigüedad máxima de la última sincronización correcta antes de considerar la tasa desactualizada (6 h). */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Límites admitidos para una tasa manual (Bs por USD). */
export const MANUAL_RATE_MIN = 0.0001;
export const MANUAL_RATE_MAX = 1_000_000_000;

export const SETTINGS_KEYS = {
  mode: "rate_mode",
  lastAttemptAt: "rate_last_attempt_at",
  lastSuccessAt: "rate_last_success_at",
  lastError: "rate_last_error",
} as const;

/** Tasa vigente que deben usar ventas y abonos. */
export interface CurrentRate {
  id: number;
  rate: number;
  source: RateSource;
  mode: RateMode;
  api_date: string | null;
  updated_at: string;
}

/** Estado de la sincronización con la API de tasas. */
export interface RateSyncStatus {
  /** El último intento de sincronización terminó bien. */
  online: boolean;
  /** Hay una sincronización en curso. */
  syncing: boolean;
  /** No hay sincronización correcta o la última tiene más de 6 h. */
  stale: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
}

/** Respuesta de `GET /api/v1/exchange-rate`: tasa vigente (campos nulos si no hay ninguna) y estado de sincronización. */
export interface ExchangeRateOverview {
  id: number | null;
  rate: number | null;
  source: RateSource | null;
  mode: RateMode;
  api_date: string | null;
  updated_at: string | null;
  status: RateSyncStatus;
}

/** Página del historial de tasas. */
export interface ExchangeRateHistory extends Pagination {
  items: ExchangeRateRow[];
  total: number;
}

/** Dependencias inyectables de la sincronización. */
export interface SyncOptions {
  db?: Database;
  fetchRate?: OfficialRateFetcher;
}
