import { errorResponse, route } from "../../lib/http";
import { SESSION_COOKIE } from "./auth.constants";
import { requireSession } from "./auth.service";
import { readCookie } from "./read-cookie";

type WebSocketHandler<R extends Request> = (req: R, server: never) => Response | undefined;

/**
 * Define una ruta de API protegida: exige una sesión iniciada y, si no la hay, responde 401
 * en JSON. El resto del comportamiento (envío por método, 405) es el de `route()`.
 */
export function protectedRoute<R extends Request>(handlers: Parameters<typeof route<R>>[0]) {
  const inner = route<R>(handlers);
  return async (req: R, server: never): Promise<Response | undefined> => {
    try {
      requireSession(readCookie(req, SESSION_COOKIE));
    } catch (err) {
      return errorResponse(err, req);
    }
    return inner(req, server);
  };
}

/**
 * Define una ruta protegida que puede hacer upgrade a WebSocket: exige una sesión iniciada y,
 * si no la hay, responde 401 en JSON en vez de subir la conexión.
 */
export function protectedWebSocketRoute<R extends Request>(handler: WebSocketHandler<R>) {
  return async (req: R, server: never): Promise<Response | undefined> => {
    try {
      requireSession(readCookie(req, SESSION_COOKIE));
    } catch (err) {
      return errorResponse(err, req);
    }
    return handler(req, server);
  };
}
