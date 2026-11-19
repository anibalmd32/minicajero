import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError } from "../../lib/http-errors";
import { readSettings } from "../settings/settings.repository";
import { type ExchangeRateRow, findLatestRate, type RateSource } from "./exchange-rates.repository";
import {
  type CurrentRate,
  type ExchangeRateOverview,
  RATE_MODES,
  type RateMode,
  type RateSyncStatus,
  SETTINGS_KEYS,
  STALE_AFTER_MS,
} from "./exchange-rates.types";

const NO_RATE_MESSAGE = "No hay tasa de cambio disponible. Fija una tasa manual para poder continuar.";

export const inFlightSyncs = new WeakMap<Database, Promise<void>>();

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

export function readMode(db: Database): RateMode {
  const stored = readSettings(db)[SETTINGS_KEYS.mode];
  return RATE_MODES.find((mode) => mode === stored) ?? "auto";
}

function resolveCurrentRow(mode: RateMode, db: Database): ExchangeRateRow | null {
  const preferred: RateSource = mode === "manual" ? "manual" : "api";
  const fallback: RateSource = mode === "manual" ? "api" : "manual";
  return findLatestRate(preferred, db) ?? findLatestRate(fallback, db);
}

function toCurrentRate(row: ExchangeRateRow, mode: RateMode): CurrentRate {
  return {
    id: row.id,
    rate: row.rate,
    source: row.source,
    mode,
    api_date: row.api_date,
    updated_at: row.source === "api" ? row.last_checked_at : row.created_at,
  };
}

/**
 * Tasa vigente según el modo: en `manual` la última tasa manual y en `auto` la última oficial
 * (cada una recurre a la otra si aún no existe). Lanza 409 si no hay ninguna tasa registrada.
 */
export function getCurrentRate(db: Database = getDb()): CurrentRate {
  const mode = readMode(db);
  const row = resolveCurrentRow(mode, db);
  if (!row) throw new ConflictError(NO_RATE_MESSAGE);
  return toCurrentRate(row, mode);
}

/** Estado de la última sincronización con la API. */
export function getSyncStatus(db: Database = getDb(), now: number = Date.now()): RateSyncStatus {
  const stored = readSettings(db);
  const lastAttemptAt = emptyToNull(stored[SETTINGS_KEYS.lastAttemptAt]);
  const lastSuccessAt = emptyToNull(stored[SETTINGS_KEYS.lastSuccessAt]);
  const lastError = emptyToNull(stored[SETTINGS_KEYS.lastError]);
  const successTime = lastSuccessAt ? Date.parse(lastSuccessAt) : Number.NaN;
  return {
    online: lastAttemptAt !== null && lastError === null,
    syncing: inFlightSyncs.has(db),
    stale: Number.isNaN(successTime) || now - successTime > STALE_AFTER_MS,
    last_attempt_at: lastAttemptAt,
    last_success_at: lastSuccessAt,
    last_error: lastError,
  };
}

/** Tasa vigente (o nula si no hay ninguna) junto con el estado de sincronización. */
export function getRateOverview(db: Database = getDb(), now: number = Date.now()): ExchangeRateOverview {
  const mode = readMode(db);
  const row = resolveCurrentRow(mode, db);
  const current = row ? toCurrentRate(row, mode) : null;
  return {
    id: current?.id ?? null,
    rate: current?.rate ?? null,
    source: current?.source ?? null,
    mode,
    api_date: current?.api_date ?? null,
    updated_at: current?.updated_at ?? null,
    status: getSyncStatus(db, now),
  };
}
