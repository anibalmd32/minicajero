import { BadRequestError, HttpError } from "./http-errors";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isSameLocalOrigin(origin: string, requestUrl: string): boolean {
  try {
    const source = new URL(origin);
    const target = new URL(requestUrl);
    return source.host === target.host && LOOPBACK_HOSTNAMES.has(source.hostname);
  } catch {
    return false;
  }
}

/**
 * Si la solicitud trae `Origin`, exige que sea la propia aplicación en localhost (403 si no),
 * para que otra web abierta en el navegador no pueda disparar acciones destructivas.
 */
export function requireSameLocalOrigin(req: Request, message: string): void {
  const origin = req.headers.get("origin");
  if (origin !== null && !isSameLocalOrigin(origin, req.url)) throw new HttpError(403, message);
}

/** Tipo MIME de una cabecera `Content-Type`, sin parámetros y en minúsculas. */
export function mimeEssence(contentType: string | null): string {
  return ((contentType ?? "").split(";")[0] ?? "").trim().toLowerCase();
}

/**
 * Exige que la solicitud vaya dirigida a esta computadora por su nombre local (`Host` localhost, 127.0.0.1 o [::1]);
 * 403 si no, para que una web que apunte su dominio a 127.0.0.1 no pueda leer las respuestas.
 */
export function requireLoopbackHost(req: Request, message: string): void {
  let hostname: string;
  try {
    hostname = new URL(req.url).hostname;
  } catch {
    throw new HttpError(403, message);
  }
  if (!LOOPBACK_HOSTNAMES.has(hostname)) throw new HttpError(403, message);
}

/** Exige `Content-Type: application/json` exacto (obliga al navegador a una comprobación CORS previa); 400 si no. */
export function requireJsonContentType(req: Request): void {
  if (mimeEssence(req.headers.get("content-type")) !== "application/json") {
    throw new BadRequestError("El cuerpo debe enviarse como application/json");
  }
}
