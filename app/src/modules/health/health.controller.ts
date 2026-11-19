import { json } from "../../lib/http";
import { APP_ID, APP_VERSION } from "../../lib/version";

const startedAt = new Date();

/** GET /api/v1/health — comprobación de que el servidor responde e identificación de la aplicación. */
export function getHealth(): Response {
  return json({
    status: "ok",
    app: APP_ID,
    version: APP_VERSION,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
  });
}
