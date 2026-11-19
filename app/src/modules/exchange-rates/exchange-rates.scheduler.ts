import type { OfficialRateFetcher } from "./dolar-api.client";
import { syncOfficialRate } from "./exchange-rates.service";

/** Intervalo de sincronización automática de la tasa oficial (3 h). */
export const RATE_SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000;

/** Opciones del programador de sincronización. */
export interface RateSyncSchedulerOptions {
  intervalMs?: number;
  fetchRate?: OfficialRateFetcher;
}

/**
 * Sincroniza la tasa oficial en segundo plano: una vez al arrancar (sin bloquear) y luego cada `intervalMs`.
 * Devuelve una función para detenerlo.
 */
export function startRateSyncScheduler({
  intervalMs = RATE_SYNC_INTERVAL_MS,
  fetchRate,
}: RateSyncSchedulerOptions = {}): () => void {
  const run = (): void => {
    syncOfficialRate({ fetchRate }).catch((err) => console.error("[tasa] Error inesperado al sincronizar:", err));
  };
  setTimeout(run, 0);
  const timer = setInterval(run, intervalMs);
  return () => clearInterval(timer);
}
