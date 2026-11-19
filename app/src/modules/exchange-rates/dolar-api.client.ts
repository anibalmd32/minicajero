import { normalizeRate } from "../../lib/money";

/** URL por defecto de la API de tasas (DolarApi Venezuela). */
export const DEFAULT_RATE_API_URL = "https://ve.dolarapi.com/v1/dolares";

/** Variable de entorno para sustituir la URL de la API (pruebas, proxys). */
export const RATE_API_URL_ENV = "MINICAJERO_RATE_API_URL";

/** Tiempo máximo de espera de la API de tasas. */
export const RATE_API_TIMEOUT_MS = 10_000;

const OFFICIAL_SOURCE = "oficial";

/** Tasa oficial devuelta por la API: Bs por USD y fecha de publicación (ISO UTC). */
export interface OfficialRate {
  rate: number;
  apiDate: string;
}

/** Fallo al consultar la API de tasas, con un mensaje apto para mostrar al operador. */
export class RateApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RateApiError";
  }
}

/** Función que obtiene la tasa oficial; se inyecta en el servicio para poder probarlo sin red. */
export type OfficialRateFetcher = () => Promise<OfficialRate>;

/** URL efectiva de la API: `MINICAJERO_RATE_API_URL` si está definida, si no la de DolarApi. */
export function resolveRateApiUrl(env: Record<string, string | undefined> = process.env): string {
  return env[RATE_API_URL_ENV]?.trim() || DEFAULT_RATE_API_URL;
}

/** Consulta la API y devuelve la tasa oficial (`fuente: "oficial"`, campo `promedio`). Lanza `RateApiError` ante cualquier fallo. */
export async function fetchOfficialRate(
  url: string = resolveRateApiUrl(),
  timeoutMs: number = RATE_API_TIMEOUT_MS,
): Promise<OfficialRate> {
  const response = await request(url, timeoutMs);
  if (!response.ok) throw new RateApiError(`La API de tasas respondió con el estado ${response.status}`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    throw new RateApiError("La API de tasas devolvió una respuesta que no es JSON", { cause: err });
  }
  return parseOfficialRate(payload);
}

async function request(url: string, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new RateApiError("La API de tasas no respondió a tiempo", { cause: err });
    }
    throw new RateApiError("Sin conexión a internet o la API de tasas no está disponible", { cause: err });
  }
}

/** Extrae y valida la tasa oficial del cuerpo de la API. */
export function parseOfficialRate(payload: unknown): OfficialRate {
  if (!Array.isArray(payload)) throw new RateApiError("Respuesta inesperada de la API de tasas");
  const official: unknown = payload.find(
    (item: unknown) =>
      typeof item === "object" && item !== null && (item as Record<string, unknown>).fuente === OFFICIAL_SOURCE,
  );
  if (!official || typeof official !== "object") {
    throw new RateApiError("La API de tasas no incluye la tasa oficial");
  }
  const { promedio, fechaActualizacion } = official as Record<string, unknown>;
  if (typeof promedio !== "number" || !Number.isFinite(promedio) || promedio <= 0) {
    throw new RateApiError("La API de tasas devolvió una tasa oficial inválida");
  }
  const date = typeof fechaActualizacion === "string" ? new Date(fechaActualizacion) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new RateApiError("La API de tasas devolvió una fecha de actualización inválida");
  }
  let rate: number;
  try {
    rate = normalizeRate(promedio);
  } catch (err) {
    throw new RateApiError("La API de tasas devolvió una tasa oficial inválida", { cause: err });
  }
  return { rate, apiDate: date.toISOString() };
}
