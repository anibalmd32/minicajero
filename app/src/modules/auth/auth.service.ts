import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError, HttpError } from "../../lib/http-errors";
import { hashPassword, hashToken, type PasswordHash, verifyPassword } from "../../lib/password";
import type { JsonObject } from "../../lib/request";
import { deleteAllSessions, deleteSession, findUser, saveUser, sessionExists } from "./auth.repository";
import { validatePassword, validateUsername } from "./credentials-validation";
import { isMasterResetKey, MASTER_RESET_KEY_HASH } from "./master-reset-key";
import { type AuthSession, openSession } from "./session";

/** Estado de acceso que devuelve la API. */
export interface AuthStatus {
  needsSetup: boolean;
  authenticated: boolean;
  username: string | null;
}

function saveCredentials(username: string, password: string, db: Database): void {
  const { hash, salt } = hashPassword(password);
  saveUser({ username, password_hash: hash, password_salt: salt }, db);
}

function requireUser(db: Database) {
  const user = findUser(db);
  if (user === null) throw new ConflictError("Todavía no hay un usuario en esta aplicación");
  return user;
}

/** Estado de acceso: si falta crear el usuario y si la sesión actual es válida. */
export function getAuthStatus(token: string | null, db: Database = getDb()): AuthStatus {
  const user = findUser(db);
  return {
    needsSetup: user === null,
    authenticated: user !== null && token !== null && sessionExists(hashToken(token), db),
    username: user?.username ?? null,
  };
}

/** Crea el usuario y la contraseña (solo si no existe ninguno) y abre sesión. */
export function createUser(body: JsonObject, db: Database = getDb()): AuthSession {
  if (findUser(db) !== null) throw new ConflictError("Ya existe un usuario en esta aplicación");
  const username = validateUsername(body.username);
  saveCredentials(username, validatePassword(body.password), db);
  return openSession(username, db);
}

/** Comprueba las credenciales y abre sesión. 401 si no coinciden. */
export function login(body: JsonObject, db: Database = getDb()): AuthSession {
  const user = requireUser(db);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const valid =
    username.toLowerCase() === user.username.toLowerCase() &&
    verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) throw new HttpError(401, "El usuario o la contraseña no son correctos");
  return openSession(user.username, db);
}

/**
 * Crea de nuevo el usuario y la contraseña con la clave maestra de reinicio.
 * Invalida las sesiones anteriores.
 */
export function resetWithMasterKey(
  body: JsonObject,
  db: Database = getDb(),
  masterKeyHash: PasswordHash = MASTER_RESET_KEY_HASH,
): AuthSession {
  if (!isMasterResetKey(body.master_key, masterKeyHash)) {
    throw new HttpError(403, "La clave de reinicio no es correcta");
  }
  const username = validateUsername(body.username);
  saveCredentials(username, validatePassword(body.password), db);
  deleteAllSessions(db);
  return openSession(username, db);
}

/** Cierra la sesión del token dado. */
export function logout(token: string | null, db: Database = getDb()): void {
  if (token === null) return;
  deleteSession(hashToken(token), db);
}

/**
 * Cambia la contraseña del usuario: pide la actual y deja al usuario con sesión iniciada.
 * 401 si la contraseña actual no es la correcta.
 */
export function changePassword(body: JsonObject, db: Database = getDb()): string {
  const user = requireUser(db);
  const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
  if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
    throw new HttpError(401, "La contraseña actual no es correcta");
  }
  saveCredentials(user.username, validatePassword(body.new_password), db);
  return user.username;
}

/** Comprueba que el token de la solicitud corresponde a una sesión vigente. */
export function requireSession(token: string | null, db: Database = getDb()): void {
  if (token === null || !sessionExists(hashToken(token), db)) {
    throw new HttpError(401, "Debes iniciar sesión para continuar");
  }
}
