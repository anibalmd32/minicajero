import type { Server } from "bun";
import movilPage from "../../resources/html/movil.html";
import type { CertificatePair } from "./certificate";
import { PHONE_CLOSE, PHONE_PAGE_PATH, PHONE_SOCKET_PATH } from "./phone.protocol";
import type { PhoneHub } from "./phone-hub";
import { type PhoneSocketData, phoneWebSocketHandler } from "./phone-socket-handler";

export { PHONE_MAX_MESSAGE_BYTES, type PhoneSocketData } from "./phone-socket-handler";

const IPV4_MAPPED_PREFIX = "::ffff:";

/** Servidor HTTPS de la red local para el teléfono. */
export type LanServer = Server<PhoneSocketData>;

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function plainResponse(text: string, status: number): Response {
  return new Response(text, { status, headers: { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
}

function clientIp(req: Request, server: Server<PhoneSocketData>): string {
  const address = server.requestIP(req)?.address ?? "desconocida";
  return address.startsWith(IPV4_MAPPED_PREFIX) ? address.slice(IPV4_MAPPED_PREFIX.length) : address;
}

function isOwnOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function upgradePhoneSocket(req: Request, server: Server<PhoneSocketData>, hub: PhoneHub): Response | undefined {
  if (req.method !== "GET") return plainResponse("Método no permitido", 405);
  if (!isOwnOrigin(req)) return plainResponse("Origen no permitido", 403);
  const ip = clientIp(req, server);
  if (hub.admissionError(ip)?.code === PHONE_CLOSE.busy) return plainResponse("Demasiadas conexiones", 429);
  const data: PhoneSocketData = { ip, userAgent: req.headers.get("user-agent"), phone: null };
  if (server.upgrade(req, { data })) return undefined;
  return plainResponse("Se esperaba una conexión WebSocket", 426);
}

/**
 * Levanta el servidor HTTPS en todas las interfaces (0.0.0.0) con el certificado propio. Solo expone la página
 * móvil (`/movil` y sus archivos empaquetados) y el WebSocket `/movil/ws`; cualquier otra ruta responde 404.
 * Lanza `EADDRINUSE` si el puerto está ocupado.
 */
export function startLanServer(port: number, tls: CertificatePair, hub: PhoneHub): LanServer {
  return Bun.serve<PhoneSocketData>({
    hostname: "0.0.0.0",
    port,
    tls,
    development: false,
    routes: {
      [PHONE_PAGE_PATH]: movilPage,
      [PHONE_SOCKET_PATH]: (req: Request, server: LanServer) => upgradePhoneSocket(req, server, hub),
    },
    fetch: () => plainResponse("No encontrado", 404),
    error: (err) => {
      console.error("[servidor del teléfono]", err);
      return plainResponse("Error interno", 500);
    },
    websocket: phoneWebSocketHandler(hub),
  });
}
