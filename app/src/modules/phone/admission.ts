import type { PhoneConnection } from "./hub-types";
import type { PairingRegistry } from "./pairing";
import { PHONE_CLOSE } from "./phone.protocol";
import { PHONE_TEXTS } from "./phone-texts";

/** Conexiones abiertas sin identificarse permitidas por IP. */
export const MAX_UNIDENTIFIED_PER_IP = 3;

/** Conexiones abiertas sin identificarse permitidas en total. */
export const MAX_UNIDENTIFIED_TOTAL = 20;

/** Motivo para cerrar una conexión rechazada. */
export interface Rejection {
  code: number;
  reason: string;
}

/**
 * Motivo para rechazar una conexión nueva desde `ip` (IP bloqueada o demasiadas conexiones sin identificarse),
 * o `null` si se acepta.
 */
export function admissionError(
  registry: PairingRegistry,
  phones: Iterable<PhoneConnection>,
  ip: string,
): Rejection | null {
  if (registry.isLocked(ip)) return { code: PHONE_CLOSE.tooManyAttempts, reason: PHONE_TEXTS.locked };
  const unidentified = [...phones].filter((phone) => phone.session === null);
  const fromIp = unidentified.filter((phone) => phone.ip === ip).length;
  if (fromIp >= MAX_UNIDENTIFIED_PER_IP || unidentified.length >= MAX_UNIDENTIFIED_TOTAL) {
    return { code: PHONE_CLOSE.busy, reason: PHONE_TEXTS.busy };
  }
  return null;
}
