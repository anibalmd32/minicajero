import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError } from "../../lib/http-errors";
import { normalizeRate } from "../../lib/money";
import type { JsonObject, Pagination } from "../../lib/request";
import { Validator } from "../../lib/validation";
import { writeSettings } from "../settings/settings.repository";
import { getRateOverview } from "./exchange-rates.overview";
import { countRates, findLatestRate, insertRate, listRates } from "./exchange-rates.repository";
import { syncOfficialRate } from "./exchange-rates.sync";
import {
  type ExchangeRateHistory,
  type ExchangeRateOverview,
  MANUAL_RATE_MAX,
  MANUAL_RATE_MIN,
  RATE_MODES,
  SETTINGS_KEYS,
  type SyncOptions,
} from "./exchange-rates.types";

export { getCurrentRate, getRateOverview, getSyncStatus } from "./exchange-rates.overview";
export { syncOfficialRate } from "./exchange-rates.sync";
export {
  type CurrentRate,
  type ExchangeRateHistory,
  type ExchangeRateOverview,
  MANUAL_RATE_MAX,
  MANUAL_RATE_MIN,
  RATE_MODES,
  type RateMode,
  type RateSyncStatus,
  STALE_AFTER_MS,
  type SyncOptions,
} from "./exchange-rates.types";

/** Registra una tasa manual (historial `source = manual`) y pasa al modo manual. */
export function setManualRate(body: JsonObject, db: Database = getDb()): ExchangeRateOverview {
  const v = new Validator(body);
  const rate = v.nonNegativeNumber("rate", { min: MANUAL_RATE_MIN, max: MANUAL_RATE_MAX, maxDecimals: 4 });
  v.assertValid("Revisa la tasa de cambio");
  db.transaction(() => {
    insertRate({ rate: normalizeRate(rate), source: "manual", api_date: null }, db);
    writeSettings({ [SETTINGS_KEYS.mode]: "manual" }, db);
  })();
  return getRateOverview(db);
}

/**
 * Cambia el modo de tasa. Pasar a `manual` exige una tasa manual previa (409 si no la hay).
 * Al volver a `auto` sin ninguna tasa oficial registrada, intenta sincronizar antes de responder.
 */
export async function setRateMode(body: JsonObject, options: SyncOptions = {}): Promise<ExchangeRateOverview> {
  const db = options.db ?? getDb();
  const v = new Validator(body);
  const mode = v.oneOf("mode", RATE_MODES);
  v.assertValid("Modo de tasa inválido");
  if (mode === "manual" && !findLatestRate("manual", db)) {
    throw new ConflictError("No hay una tasa manual registrada. Fija una tasa manual primero.");
  }
  writeSettings({ [SETTINGS_KEYS.mode]: mode }, db);
  if (mode === "auto" && !findLatestRate("api", db)) return syncOfficialRate({ ...options, db });
  return getRateOverview(db);
}

/** Historial de tasas paginado, del más reciente al más antiguo. */
export function getRateHistory({ limit, offset }: Pagination, db: Database = getDb()): ExchangeRateHistory {
  return { items: listRates(limit, offset, db), total: countRates(db), limit, offset };
}
