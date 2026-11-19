import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { writeSettings } from "../settings/settings.repository";
import { fetchOfficialRate, type OfficialRate, type OfficialRateFetcher, RateApiError } from "./dolar-api.client";
import { getRateOverview, inFlightSyncs } from "./exchange-rates.overview";
import { findLatestRate, insertRate, touchRate } from "./exchange-rates.repository";
import { type ExchangeRateOverview, SETTINGS_KEYS, type SyncOptions } from "./exchange-rates.types";

const FETCH_FAILED_MESSAGE = "No se pudo obtener la tasa oficial";
const SAVE_FAILED_MESSAGE = "No se pudo guardar la tasa obtenida de la API";

function saveOfficialRate(official: OfficialRate, attemptAt: string, db: Database): void {
  db.transaction(() => {
    const latest = findLatestRate("api", db);
    if (latest && latest.rate === official.rate && latest.api_date === official.apiDate) {
      touchRate(latest.id, db);
    } else {
      insertRate({ rate: official.rate, source: "api", api_date: official.apiDate }, db);
    }
    writeSettings(
      {
        [SETTINGS_KEYS.lastAttemptAt]: attemptAt,
        [SETTINGS_KEYS.lastSuccessAt]: new Date().toISOString(),
        [SETTINGS_KEYS.lastError]: "",
      },
      db,
    );
  })();
}

function recordFailure(attemptAt: string, message: string, db: Database): void {
  writeSettings({ [SETTINGS_KEYS.lastAttemptAt]: attemptAt, [SETTINGS_KEYS.lastError]: message }, db);
}

async function runSync(db: Database, fetchRate: OfficialRateFetcher): Promise<void> {
  const attemptAt = new Date().toISOString();
  let official: OfficialRate;
  try {
    official = await fetchRate();
  } catch (err) {
    const message = err instanceof RateApiError ? err.message : FETCH_FAILED_MESSAGE;
    console.warn(`[tasa] Sincronización fallida: ${message}`);
    recordFailure(attemptAt, message, db);
    return;
  }
  try {
    saveOfficialRate(official, attemptAt, db);
  } catch (err) {
    console.error("[tasa] Error al guardar la tasa oficial:", err);
    recordFailure(attemptAt, SAVE_FAILED_MESSAGE, db);
  }
}

/**
 * Consulta la tasa oficial y la registra en el historial (si no cambió el valor ni la fecha de la API,
 * solo actualiza `last_checked_at`). No lanza por fallos de red o de la API: quedan en el estado
 * (`online: false`, `last_error`). Si ya hay una sincronización en curso, espera a esa en vez de lanzar otra.
 */
export async function syncOfficialRate({
  db = getDb(),
  fetchRate = () => fetchOfficialRate(),
}: SyncOptions = {}): Promise<ExchangeRateOverview> {
  let pending = inFlightSyncs.get(db);
  if (!pending) {
    pending = runSync(db, fetchRate).finally(() => inFlightSyncs.delete(db));
    inFlightSyncs.set(db, pending);
  }
  await pending;
  return getRateOverview(db);
}
