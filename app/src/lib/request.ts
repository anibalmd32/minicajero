import { BadRequestError } from "./http-errors";

export type JsonObject = Record<string, unknown>;

/** Tamaño máximo aceptado para cuerpos JSON (1 MiB). */
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Lee el cuerpo como JSON y exige que sea un objeto.
 * Lanza 400 si está vacío, es demasiado grande, no es JSON válido o no es un objeto.
 */
export async function readJson(req: Request): Promise<JsonObject> {
  return (await readJsonBody(req, false)) ?? {};
}

/** Como `readJson`, pero un cuerpo vacío o ausente se interpreta como `{}` (para acciones con campos opcionales). */
export async function readOptionalJson(req: Request): Promise<JsonObject> {
  return (await readJsonBody(req, true)) ?? {};
}

function assertJsonContentType(req: Request): void {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new BadRequestError("El cuerpo debe enviarse como application/json");
  }
}

function assertDeclaredLengthWithinLimit(req: Request): void {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new BadRequestError("El cuerpo de la solicitud es demasiado grande");
  }
}

function parseJsonObject(text: string): JsonObject {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BadRequestError("El cuerpo no es JSON válido");
  }
  if (!isJsonObject(data)) {
    throw new BadRequestError("El cuerpo debe ser un objeto JSON");
  }
  return data;
}

async function readJsonBody(req: Request, allowEmpty: boolean): Promise<JsonObject | null> {
  assertJsonContentType(req);
  assertDeclaredLengthWithinLimit(req);
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new BadRequestError("El cuerpo de la solicitud es demasiado grande");
  }
  if (text.trim() === "") {
    if (allowEmpty) return null;
    throw new BadRequestError("El cuerpo de la solicitud está vacío");
  }
  return parseJsonObject(text);
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lee un parámetro de ruta numérico (`/clientes/:id`) como entero positivo; 400 si no lo es. */
export function parseIdParam(raw: string | undefined): number {
  if (raw === undefined || !/^[1-9]\d{0,15}$/.test(raw)) {
    throw new BadRequestError("Identificador inválido");
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw new BadRequestError("Identificador inválido");
  return id;
}

/** Paginación de listados (`?limit&offset`). */
export interface Pagination {
  limit: number;
  offset: number;
}

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

const NON_NEGATIVE_INTEGER = /^\d{1,9}$/;

/**
 * Lee `limit` y `offset` de la query string. Ausentes usan los valores por defecto;
 * si no son enteros válidos o `limit` está fuera de 1..`maxLimit` lanza 400 con detalle por campo.
 */
export function parsePagination(url: URL, { defaultLimit = 50, maxLimit = 200 }: PaginationOptions = {}): Pagination {
  const details: Record<string, string> = {};
  const limit = readQueryInteger(url, "limit", defaultLimit);
  const offset = readQueryInteger(url, "offset", 0);
  if (limit === null || limit < 1 || limit > maxLimit) details.limit = `Debe ser un entero entre 1 y ${maxLimit}`;
  if (offset === null) details.offset = "Debe ser un entero mayor o igual que 0";
  if (Object.keys(details).length > 0) throw new BadRequestError("Parámetros de paginación inválidos", details);
  return { limit: limit ?? defaultLimit, offset: offset ?? 0 };
}

function readQueryInteger(url: URL, name: string, fallback: number): number | null {
  const raw = url.searchParams.get(name)?.trim() ?? "";
  if (raw === "") return fallback;
  return NON_NEGATIVE_INTEGER.test(raw) ? Number(raw) : null;
}

const TRUE_FLAGS = ["1", "true"];
const FALSE_FLAGS = ["0", "false"];

/**
 * Lee un indicador booleano de la query string (`1`/`true` o `0`/`false`, sin distinguir mayúsculas).
 * Devuelve `null` si viene ausente o vacío; lanza 400 con detalle del campo si tiene otro valor.
 */
export function parseQueryFlag(raw: string | null, field: string): boolean | null {
  const flag = raw?.trim().toLowerCase() ?? "";
  if (flag === "") return null;
  if (TRUE_FLAGS.includes(flag)) return true;
  if (FALSE_FLAGS.includes(flag)) return false;
  throw new BadRequestError("Parámetros de búsqueda inválidos", { [field]: "Debe ser 1 o 0" });
}
