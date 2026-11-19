import { PHONE_CLOSE } from "../../../modules/phone/phone.protocol";

/** Texto cuando el enlace del QR o la sesión ya no sirven. */
export const EXPIRED_LINK_TEXT = "Este enlace ya no sirve. Escanea de nuevo el código de la computadora.";

/** Texto tras desconectar el teléfono desde el propio teléfono. */
export const USER_DISCONNECTED_TEXT = "Desconectado. Para volver, escanea de nuevo el código de la computadora.";

/** Qué hacer cuando se cierra la conexión con la computadora. */
export type CloseOutcome = { kind: "retry" } | { kind: "end"; text: string; reload: boolean };

const FINAL_CLOSE_TEXTS: Record<number, string> = {
  [PHONE_CLOSE.invalidToken]: EXPIRED_LINK_TEXT,
  [PHONE_CLOSE.sessionExpired]: EXPIRED_LINK_TEXT,
  [PHONE_CLOSE.tooManyAttempts]:
    "Hubo demasiados intentos. Espera unos minutos y escanea de nuevo el código de la computadora.",
  [PHONE_CLOSE.disconnectedFromPc]: "La computadora desconectó este teléfono. Para volver, escanea de nuevo su código.",
  [PHONE_CLOSE.replaced]: "Este teléfono se conectó en otra pestaña. Sigue en esa pestaña.",
  [PHONE_CLOSE.outdated]: "Hay una versión nueva de esta página. Recárgala para seguir.",
};

/** Decide si reintentar o terminar según el código de cierre del WebSocket. */
export function closeOutcome(code: number): CloseOutcome {
  const text = FINAL_CLOSE_TEXTS[code];
  if (text === undefined) return { kind: "retry" };
  return { kind: "end", text, reload: code === PHONE_CLOSE.outdated };
}
