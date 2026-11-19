import type { BunRequest, Server, ServerWebSocket, WebSocketHandler } from "bun";
import { errorResponse, json } from "../../lib/http";
import { HttpError, MethodNotAllowedError } from "../../lib/http-errors";
import { readJson, readOptionalJson } from "../../lib/request";
import { requireJsonContentType, requireLoopbackHost, requireSameLocalOrigin } from "../../lib/same-origin";
import { getPhoneScanner } from "./phone.service";
import type { PcTab } from "./phone-hub";

const LOCAL_ONLY = "Solo la propia aplicación puede usar el escáner con el teléfono";
const PC_MAX_MESSAGE_BYTES = 16 * 1024;

/** Datos de cada WebSocket de pestaña de la PC. */
export interface PcSocketData {
  kind: "phone-events";
  tab: PcTab | null;
}

function requireLocalApp(req: Request): void {
  requireLoopbackHost(req, LOCAL_ONLY);
  requireSameLocalOrigin(req, LOCAL_ONLY);
}

/** POST /api/v1/phone/pairing — crea un QR para conectar un teléfono y enciende el servidor de la red local. */
export async function createPairingHandler(req: Request): Promise<Response> {
  requireLocalApp(req);
  requireJsonContentType(req);
  await readOptionalJson(req);
  return json(await getPhoneScanner().startPairing(), 201);
}

/** GET /api/v1/phone/status — si el servidor está encendido, el QR pendiente y los teléfonos conectados. */
export function getPhoneStatusHandler(req: Request): Response {
  requireLocalApp(req);
  return json(getPhoneScanner().status());
}

/** POST /api/v1/phone/pairing/cancel — anula el QR que se mostraba (`{ token }`) al cerrar el diálogo sin conectar ningún teléfono. */
export async function cancelPairingHandler(req: Request): Promise<Response> {
  requireLocalApp(req);
  requireJsonContentType(req);
  const body = await readJson(req);
  getPhoneScanner().cancelPairing(typeof body.token === "string" ? body.token : "");
  return json(getPhoneScanner().status());
}

/** DELETE /api/v1/phone/pairing — desconecta todos los teléfonos y apaga el servidor de la red local. */
export function deletePairingHandler(req: Request): Response {
  requireLocalApp(req);
  getPhoneScanner().disconnectAll();
  return json(getPhoneScanner().status());
}

/** DELETE /api/v1/phone/phones/:id — desconecta un teléfono (su sesión deja de servir). */
export function deletePhoneHandler(req: BunRequest<"/api/v1/phone/phones/:id">): Response {
  requireLocalApp(req);
  getPhoneScanner().disconnectPhone(req.params.id);
  return json(getPhoneScanner().status());
}

/**
 * GET /api/v1/phone/events — WebSocket de las pestañas de la PC (solo desde la propia aplicación): reciben
 * los escaneos y la lista de teléfonos, e informan en qué página están.
 */
export function phoneEventsHandler(req: Request, server: Server<PcSocketData>): Response | undefined {
  try {
    if (req.method !== "GET") throw new MethodNotAllowedError();
    requireLocalApp(req);
    if (server.upgrade(req, { data: { kind: "phone-events", tab: null } })) return undefined;
    throw new HttpError(426, "Se esperaba una conexión WebSocket");
  } catch (err) {
    return errorResponse(err, req);
  }
}

/** Manejadores del WebSocket de las pestañas de la PC en el servidor local. */
export const pcEventsWebSocket: WebSocketHandler<PcSocketData> = {
  maxPayloadLength: PC_MAX_MESSAGE_BYTES,
  perMessageDeflate: false,
  open(ws: ServerWebSocket<PcSocketData>) {
    ws.data.tab = getPhoneScanner().pcOpened(ws);
  },
  message(ws: ServerWebSocket<PcSocketData>, message: string | Buffer) {
    if (ws.data.tab && typeof message === "string") getPhoneScanner().hub.pcMessage(ws.data.tab, message);
  },
  close(ws: ServerWebSocket<PcSocketData>) {
    if (ws.data.tab) getPhoneScanner().hub.pcClosed(ws.data.tab);
  },
};
