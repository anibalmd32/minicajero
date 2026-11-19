import type { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { hashToken } from "../../lib/password";
import { SESSION_DURATION_DAYS } from "./auth.constants";
import { insertSession } from "./auth.repository";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Resultado de un inicio de sesión o de una creación de usuario. */
export interface AuthSession {
  username: string;
  token: string;
  expiresAt: string;
}

/** Genera un token de sesión nuevo. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Abre una sesión nueva: guarda solo el hash del token y devuelve el token en claro para la cookie. */
export function openSession(username: string, db: Database): AuthSession {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * DAY_MS).toISOString();
  insertSession(hashToken(token), expiresAt, db);
  return { username, token, expiresAt };
}
