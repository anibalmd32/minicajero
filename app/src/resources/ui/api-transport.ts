import { ApiError } from "./api-error";

/** Valores admitidos en la query string; `undefined`, `null` y `""` se omiten. */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

const API_BASE = "/api/v1";

export function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

export async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return undefined;
  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
  if (!isJson) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor de MiniCajero");
  }
}
