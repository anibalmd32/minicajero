import { json } from "../../lib/http";
import { HttpError } from "../../lib/http-errors";
import { readOptionalJson } from "../../lib/request";
import { requireJsonContentType, requireSameLocalOrigin } from "../../lib/same-origin";
import { getAppInfo, requestShutdown } from "./app.service";

/** GET /api/v1/app — versión, carpeta de datos y modo de ejecución. */
export function getAppInfoHandler(): Response {
  return json(getAppInfo());
}

/**
 * POST /api/v1/app/shutdown — cierra la BD y termina el proceso tras responder.
 * Exige `Content-Type: application/json` exacto (obliga al navegador a una comprobación CORS previa) y,
 * si llega `Origin`, que sea la propia aplicación en localhost, para que otra web no pueda dispararlo.
 */
export async function shutdownAppHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, "Solo la propia aplicación puede cerrarse a sí misma");
  requireJsonContentType(req);
  await readOptionalJson(req);
  if (!requestShutdown()) throw new HttpError(500, "El cierre de la aplicación no está disponible");
  return json({ status: "closing" }, 202);
}
