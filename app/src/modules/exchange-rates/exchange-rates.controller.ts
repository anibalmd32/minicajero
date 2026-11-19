import { json } from "../../lib/http";
import { parsePagination, readJson } from "../../lib/request";
import {
  getRateHistory,
  getRateOverview,
  setManualRate,
  setRateMode,
  syncOfficialRate,
} from "./exchange-rates.service";

/** GET /api/v1/exchange-rate — tasa vigente y estado de sincronización. */
export function getExchangeRateHandler(): Response {
  return json(getRateOverview());
}

/** POST /api/v1/exchange-rate/refresh — fuerza la sincronización con la API y devuelve el estado resultante. */
export async function refreshExchangeRateHandler(): Promise<Response> {
  return json(await syncOfficialRate());
}

/** PUT /api/v1/exchange-rate/manual — fija una tasa manual `{ rate }` y pasa a modo manual. */
export async function putManualRateHandler(req: Request): Promise<Response> {
  return json(setManualRate(await readJson(req)));
}

/** PUT /api/v1/exchange-rate/mode — cambia el modo `{ mode: "auto" | "manual" }`. */
export async function putRateModeHandler(req: Request): Promise<Response> {
  return json(await setRateMode(await readJson(req)));
}

/** GET /api/v1/exchange-rate/history?limit&offset — historial de tasas. */
export function getRateHistoryHandler(req: Request): Response {
  return json(getRateHistory(parsePagination(new URL(req.url))));
}
