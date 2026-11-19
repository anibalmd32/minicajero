import { type PasswordHash, verifyPassword } from "../../lib/password";

/** Formato admitido para la clave maestra: solo dígitos, entre 6 y 12. */
export const MASTER_RESET_KEY_PATTERN = /^\d{6,12}$/;

/**
 * Hash PBKDF2 de la clave maestra de reinicio, que permite crear de nuevo el usuario y la contraseña si se olvidan.
 * No vive en el código: en desarrollo sale de `.env.local` y `scripts/build.ts` lo incrusta en el binario al compilar.
 * Sin hash configurado ninguna clave es válida. Para generarlo: `bun scripts/hash-master-key.ts <clave>`.
 */
export const MASTER_RESET_KEY_HASH: PasswordHash = {
  hash: process.env.MINICAJERO_MASTER_KEY_HASH ?? "",
  salt: process.env.MINICAJERO_MASTER_KEY_SALT ?? "",
};

/** ¿El texto es la clave maestra de reinicio? Compara su hash en tiempo constante. */
export function isMasterResetKey(raw: unknown, expected: PasswordHash = MASTER_RESET_KEY_HASH): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!MASTER_RESET_KEY_PATTERN.test(value)) return false;
  return verifyPassword(value, expected.hash, expected.salt);
}
