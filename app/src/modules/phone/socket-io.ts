import type { PeerSocket } from "./hub-types";
import type { ServerToPcMessage, ServerToPhoneMessage } from "./phone.protocol";

/** Envía un mensaje JSON y ignora los errores de un socket ya cerrado. */
export function sendMessage(socket: PeerSocket, message: ServerToPhoneMessage | ServerToPcMessage): void {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    return;
  }
}

/** Cierra el socket y ignora los errores de uno ya cerrado. */
export function closeQuietly(socket: PeerSocket, code: number, reason: string): void {
  try {
    socket.close(code, reason);
  } catch {
    return;
  }
}
