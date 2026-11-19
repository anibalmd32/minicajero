import type { Server } from "bun";
import { type ErrorDetails, HttpError, MethodNotAllowedError, NotFoundError } from "./http-errors";

/** Cuerpo estándar de error de la API. */
export interface ErrorBody {
  error: string;
  details?: ErrorDetails;
}

/** Respuesta JSON con estado (por defecto 200) y cabeceras extra. */
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

/** 204 sin contenido. */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** Convierte cualquier error en una respuesta JSON `{ error, details? }`. Los no controlados se loguean como 500. */
export function errorResponse(err: unknown, req?: Request): Response {
  if (err instanceof HttpError) {
    const body: ErrorBody = { error: err.message };
    if (err.details && Object.keys(err.details).length > 0) body.details = err.details;
    return json(body, err.status);
  }
  const where = req ? `${req.method} ${new URL(req.url).pathname}` : "sin solicitud";
  console.error(`[500] ${where}:`, err);
  return json({ error: "Error interno del servidor" } satisfies ErrorBody, 500);
}

type Handler<R extends Request> = (req: R, server: Server<unknown>) => Response | Promise<Response>;

/**
 * Envuelve un handler para que cualquier error lanzado (sync o async) se devuelva
 * como JSON con el código adecuado.
 */
export function handle<R extends Request>(fn: Handler<R>): Handler<R> {
  return async (req, server) => {
    try {
      return await fn(req, server);
    } catch (err) {
      return errorResponse(err, req);
    }
  };
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Define una ruta de API por método. Cada handler va envuelto con `handle()` y los
 * métodos no definidos responden 405 en JSON (en vez de caer en otra ruta).
 */
export function route<R extends Request>(handlers: Partial<Record<Method, Handler<R>>>): Handler<R> {
  const wrapped = new Map<string, Handler<R>>();
  for (const [method, fn] of Object.entries(handlers)) {
    if (fn) wrapped.set(method, fn);
  }
  const allow = [...wrapped.keys()].join(", ");
  return handle<R>(async (req, server) => {
    const fn = wrapped.get(req.method) ?? (req.method === "HEAD" ? wrapped.get("GET") : undefined);
    if (!fn) {
      const res = errorResponse(new MethodNotAllowedError());
      res.headers.set("Allow", allow);
      return res;
    }
    return fn(req, server);
  });
}

/** Handler para rutas /api desconocidas. */
export const apiNotFound = handle((req) => {
  throw new NotFoundError(`Ruta no encontrada: ${req.method} ${new URL(req.url).pathname}`);
});
