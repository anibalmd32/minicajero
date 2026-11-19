import { isCompiledBinary } from "./db/data-dir";
import { errorResponse } from "./lib/http";
import { type PcSocketData, pcEventsWebSocket } from "./modules/phone/phone.controller";
import { apiRoutes } from "./router/api-router";
import { uiRoutes } from "./router/ui-router";

function pageNotFound(): Response {
  return new Response("Página no encontrada", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Levanta el servidor HTTP, solo accesible desde este equipo, en el puerto indicado. Lanza `EADDRINUSE` si está ocupado. Requiere la BD inicializada. */
export function startServer(port: number) {
  return Bun.serve<PcSocketData>({
    hostname: "127.0.0.1",
    port,
    development: !isCompiledBinary() && process.env.NODE_ENV !== "production",
    routes: {
      ...uiRoutes,
      ...apiRoutes,
    },
    fetch: pageNotFound,
    websocket: pcEventsWebSocket,
    error: (err) => errorResponse(err),
  });
}

/** Servidor HTTP de la aplicación. */
export type AppServer = ReturnType<typeof startServer>;
