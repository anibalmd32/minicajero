import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";

/** Origen de una tasa registrada. */
export type RateSource = "api" | "manual";

/** Registro del historial de tasas (tabla `exchange_rates`). */
export interface ExchangeRateRow {
  id: number;
  rate: number;
  source: RateSource;
  api_date: string | null;
  created_at: string;
  last_checked_at: string;
}

/** Datos para registrar una tasa nueva. */
export interface NewExchangeRate {
  rate: number;
  source: RateSource;
  api_date: string | null;
}

const COLUMNS = "id, rate, source, api_date, created_at, last_checked_at";

/** Inserta una tasa en el historial y devuelve el registro creado. */
export function insertRate(rate: NewExchangeRate, db: Database = getDb()): ExchangeRateRow {
  const row = db
    .query<ExchangeRateRow, { rate: number; source: RateSource; api_date: string | null }>(
      `INSERT INTO exchange_rates (rate, source, api_date) VALUES ($rate, $source, $api_date) RETURNING ${COLUMNS}`,
    )
    .get(rate);
  if (!row) throw new Error("No se pudo registrar la tasa de cambio");
  return row;
}

/** Marca un registro como comprobado ahora (la API devolvió el mismo valor) y lo devuelve actualizado. */
export function touchRate(id: number, db: Database = getDb()): ExchangeRateRow | null {
  return db
    .query<ExchangeRateRow, [number]>(
      `UPDATE exchange_rates SET last_checked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? RETURNING ${COLUMNS}`,
    )
    .get(id);
}

/** Último registro de un origen (o de cualquiera si se omite). */
export function findLatestRate(source?: RateSource, db: Database = getDb()): ExchangeRateRow | null {
  if (source) {
    return db
      .query<ExchangeRateRow, [RateSource]>(
        `SELECT ${COLUMNS} FROM exchange_rates WHERE source = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      )
      .get(source);
  }
  return db
    .query<ExchangeRateRow, []>(`SELECT ${COLUMNS} FROM exchange_rates ORDER BY created_at DESC, id DESC LIMIT 1`)
    .get();
}

/** Página del historial, del más reciente al más antiguo. */
export function listRates(limit: number, offset: number, db: Database = getDb()): ExchangeRateRow[] {
  return db
    .query<ExchangeRateRow, [number, number]>(
      `SELECT ${COLUMNS} FROM exchange_rates ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset);
}

/** Total de registros del historial. */
export function countRates(db: Database = getDb()): number {
  return db.query<{ total: number }, []>("SELECT COUNT(*) AS total FROM exchange_rates").get()?.total ?? 0;
}
