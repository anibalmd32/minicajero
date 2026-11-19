import type { PhoneConnection } from "./hub-types";
import { PHONE_CLOSE, parsePhoneMessage } from "./phone.protocol";
import { type HandshakeContext, handleBye, handleHello } from "./phone-handshake";
import { PHONE_TEXTS } from "./phone-texts";

/** Atiende un mensaje crudo del teléfono: saludo, despedida o escaneo (solo si ya está identificado). */
export function dispatchPhoneMessage(context: HandshakeContext, phone: PhoneConnection, raw: string): void {
  const message = parsePhoneMessage(raw);
  if (!message) {
    context.closePhone(phone, PHONE_CLOSE.badMessage, PHONE_TEXTS.badMessage);
  } else if (message.type === "hello") {
    handleHello(context, phone, message.token, message.version, message.device);
  } else if (message.type === "bye") {
    handleBye(context, phone);
  } else if (!phone.session || !phone.info) {
    context.closePhone(phone, PHONE_CLOSE.badMessage, PHONE_TEXTS.badMessage);
  } else {
    phone.info.last_seen_at = new Date(context.clock()).toISOString();
    context.routeScan(phone, message);
  }
}
