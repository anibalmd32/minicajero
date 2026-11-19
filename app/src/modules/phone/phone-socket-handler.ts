import type { ServerWebSocket, WebSocketHandler } from "bun";
import { PHONE_CLOSE } from "./phone.protocol";
import type { PhoneConnection, PhoneHub } from "./phone-hub";
import { PHONE_TEXTS } from "./phone-texts";

/** Tamaño máximo de un mensaje del teléfono. */
export const PHONE_MAX_MESSAGE_BYTES = 4096;

const SOCKET_IDLE_TIMEOUT_S = 60;

/** Datos de cada WebSocket de teléfono. */
export interface PhoneSocketData {
  ip: string;
  userAgent: string | null;
  phone: PhoneConnection | null;
}

/** Manejadores del WebSocket de los teléfonos: delegan en el hub, que decide qué hacer con cada conexión. */
export function phoneWebSocketHandler(hub: PhoneHub): WebSocketHandler<PhoneSocketData> {
  return {
    maxPayloadLength: PHONE_MAX_MESSAGE_BYTES,
    idleTimeout: SOCKET_IDLE_TIMEOUT_S,
    sendPings: true,
    perMessageDeflate: false,
    open(ws: ServerWebSocket<PhoneSocketData>) {
      const rejection = hub.admissionError(ws.data.ip);
      if (rejection) ws.close(rejection.code, rejection.reason);
      else ws.data.phone = hub.phoneOpened(ws, ws.data.ip, ws.data.userAgent);
    },
    message(ws: ServerWebSocket<PhoneSocketData>, message: string | Buffer) {
      const phone = ws.data.phone;
      if (!phone) return;
      if (typeof message === "string") {
        hub.phoneMessage(phone, message);
      } else {
        ws.close(PHONE_CLOSE.badMessage, PHONE_TEXTS.badMessage);
        hub.phoneClosed(phone);
      }
    },
    close(ws: ServerWebSocket<PhoneSocketData>) {
      if (ws.data.phone) hub.phoneClosed(ws.data.phone);
    },
  };
}
