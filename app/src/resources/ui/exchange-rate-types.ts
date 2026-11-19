/** Origen de una tasa registrada. */
export type RateSource = "api" | "manual";

/** Modo de tasa: `auto` usa la oficial sincronizada; `manual`, la fijada por el operador. */
export type RateMode = "auto" | "manual";

/** Estado de la sincronización del servidor con la API de tasas. */
export interface RateSyncStatus {
  online: boolean;
  syncing: boolean;
  stale: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
}

/** Tasa vigente y estado de sincronización (`GET /api/v1/exchange-rate`). */
export interface ExchangeRateOverview {
  id: number | null;
  rate: number | null;
  source: RateSource | null;
  mode: RateMode;
  api_date: string | null;
  updated_at: string | null;
  status: RateSyncStatus;
}

/** Registro del historial de tasas. */
export interface ExchangeRateRecord {
  id: number;
  rate: number;
  source: RateSource;
  api_date: string | null;
  created_at: string;
  last_checked_at: string;
}

/** Página del historial de tasas. */
export interface ExchangeRateHistory {
  items: ExchangeRateRecord[];
  total: number;
  limit: number;
  offset: number;
}

/** Evento de `window` emitido cada vez que se obtiene un estado de tasa nuevo; `detail` es el `ExchangeRateOverview`. */
export const RATE_OVERVIEW_EVENT = "rateoverview";
