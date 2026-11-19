import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

/** Iteraciones de PBKDF2 usadas para derivar el hash de la contraseña. */
export const PBKDF2_ITERATIONS = 120_000;

/** Longitud de la sal, en bytes. */
export const SALT_BYTES = 16;

/** Longitud de la llave derivada, en bytes. */
export const KEY_BYTES = 32;

/** Codificación usada para la sal y el hash. */
const ENCODING = "hex";

/** Contraseña y sal con las que se derivó un hash. */
export interface PasswordHash {
  hash: string;
  salt: string;
}

/** Deriva el hash de una contraseña con una sal nueva. */
export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(SALT_BYTES).toString(ENCODING);
  return { hash: derive(password, salt), salt };
}

/** ¿La contraseña corresponde al hash guardado? Compara en tiempo constante. */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const expected = Buffer.from(hash, ENCODING);
  const actual = Buffer.from(derive(password, salt), ENCODING);
  if (expected.length !== actual.length || expected.length === 0) return false;
  return timingSafeEqual(expected, actual);
}

/** Hash de un token de sesión; solo se guarda este valor en la BD. */
export function hashToken(token: string): string {
  return pbkdf2Sync(token, "minicajero-sesion", 10_000, KEY_BYTES, "sha256").toString(ENCODING);
}

function derive(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_BYTES, "sha256").toString(ENCODING);
}
