import { json } from "../../lib/http";
import { readJson } from "../../lib/request";
import { requireJsonContentType, requireSameLocalOrigin } from "../../lib/same-origin";
import { SESSION_COOKIE } from "./auth.constants";
import { changePassword, createUser, getAuthStatus, login, logout, resetWithMasterKey } from "./auth.service";
import { readCookie } from "./read-cookie";

const LOCAL_ONLY = "Solo la propia aplicación puede cambiar el acceso";

function sessionCookie(token: string, expiresAt: string): string {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/** GET /api/v1/auth/status — si falta crear el usuario y si la sesión actual es válida. */
export function getAuthStatusHandler(req: Request): Response {
  return json(getAuthStatus(readCookie(req, SESSION_COOKIE)));
}

/** POST /api/v1/auth/setup — crea el usuario y la contraseña la primera vez. */
export async function setupHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, LOCAL_ONLY);
  requireJsonContentType(req);
  const body = await readJson(req);
  const session = createUser(body);
  return json({ username: session.username }, 201, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
}

/** POST /api/v1/auth/login — inicia sesión con el usuario y la contraseña. */
export async function loginHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, LOCAL_ONLY);
  requireJsonContentType(req);
  const body = await readJson(req);
  const session = login(body);
  return json({ username: session.username }, 200, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
}

/** POST /api/v1/auth/reset — crea de nuevo el usuario y la contraseña con la clave maestra. */
export async function resetHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, LOCAL_ONLY);
  requireJsonContentType(req);
  const body = await readJson(req);
  const session = resetWithMasterKey(body);
  return json({ username: session.username }, 200, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
}

/** POST /api/v1/auth/logout — cierra la sesión actual. */
export async function logoutHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, LOCAL_ONLY);
  requireJsonContentType(req);
  logout(readCookie(req, SESSION_COOKIE));
  return json({ status: "ok" }, 200, { "Set-Cookie": clearedCookie() });
}

/** POST /api/v1/auth/password — cambia la contraseña del usuario que está dentro. */
export async function changePasswordHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, LOCAL_ONLY);
  requireJsonContentType(req);
  const body = await readJson(req);
  const username = changePassword(body);
  return json({ username });
}
