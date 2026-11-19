import { createHash, randomBytes } from "node:crypto";
import { AttemptLimiter, type Clock } from "./attempt-limiter";
import type { PairingTicket, PhoneSession, RedeemResult } from "./pairing.types";

export { AttemptLimiter, type Clock } from "./attempt-limiter";
export type { PairingTicket, PhoneSession, RedeemResult } from "./pairing.types";

/** Vigencia del token del QR mientras nadie lo use. */
export const PAIRING_TTL_MS = 10 * 60 * 1000;

/** Duración máxima de la sesión de un teléfono desde que se emparejó. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Ventana en la que se cuentan los intentos fallidos. */
export const FAILED_ATTEMPTS_WINDOW_MS = 10 * 60 * 1000;

/** Intentos fallidos permitidos por dirección IP dentro de la ventana. */
export const MAX_FAILED_ATTEMPTS_PER_IP = 5;

/** Intentos fallidos permitidos en total dentro de la ventana; al superarlos se anula el QR pendiente. */
export const MAX_FAILED_ATTEMPTS_TOTAL = 20;

const TOKEN_BYTES = 32;
const PHONE_ID_BYTES = 9;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Token aleatorio de 32 bytes en base64url (43 caracteres). */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Tokens del emparejamiento: un único QR pendiente a la vez (de un solo uso, válido 10 min) que al usarse
 * se canjea por una sesión (válida hasta 12 h) con su propio token para reconectar. Solo guarda hashes de los
 * tokens y limita los intentos fallidos por IP y en total.
 */
export class PairingRegistry {
  private pending: { hash: string; expiresAt: number } | null = null;
  private readonly sessions = new Map<string, PhoneSession>();
  private readonly perIp: AttemptLimiter;
  private readonly total: AttemptLimiter;

  constructor(private readonly clock: Clock = Date.now) {
    this.perIp = new AttemptLimiter(MAX_FAILED_ATTEMPTS_PER_IP, FAILED_ATTEMPTS_WINDOW_MS, clock);
    this.total = new AttemptLimiter(MAX_FAILED_ATTEMPTS_TOTAL, FAILED_ATTEMPTS_WINDOW_MS, clock);
  }

  /**
   * Crea el token del QR; reemplaza al pendiente anterior (las sesiones ya emparejadas siguen). Como lo pide el
   * dueño desde la PC, también olvida los intentos fallidos y desbloquea las IP.
   */
  createPairing(): PairingTicket {
    const token = generateToken();
    const expiresAt = this.clock() + PAIRING_TTL_MS;
    this.pending = { hash: hashToken(token), expiresAt };
    this.total.reset();
    this.perIp.reset();
    return { token, expiresAt };
  }

  /** ¿La IP está bloqueada por demasiados intentos fallidos? */
  isLocked(ip: string): boolean {
    return this.perIp.isLocked(ip);
  }

  /** Vencimiento del QR pendiente, o `null` si no hay ninguno vigente. */
  pendingExpiresAt(): number | null {
    this.expire();
    return this.pending?.expiresAt ?? null;
  }

  /** Presenta un token (del QR o de sesión) desde una IP. */
  redeem(token: string, ip: string): RedeemResult {
    this.expire();
    if (this.perIp.isLocked(ip)) return { ok: false, reason: "locked" };
    const hash = TOKEN_PATTERN.test(token) ? hashToken(token) : null;
    if (hash !== null && this.pending?.hash === hash) {
      this.pending = null;
      return { ok: true, session: this.createSession(), resumed: false };
    }
    const session = hash === null ? undefined : this.sessions.get(hash);
    if (session) return { ok: true, session, resumed: true };
    return this.fail(ip);
  }

  private fail(ip: string): RedeemResult {
    const ipLocked = this.perIp.recordFailure(ip);
    if (this.total.recordFailure("*")) this.pending = null;
    return { ok: false, reason: ipLocked ? "locked" : "invalid" };
  }

  private createSession(): PhoneSession {
    const now = this.clock();
    const session: PhoneSession = {
      id: randomBytes(PHONE_ID_BYTES).toString("base64url"),
      token: generateToken(),
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    this.sessions.set(hashToken(session.token), session);
    return session;
  }

  /** Quita el QR y las sesiones vencidos; devuelve los ids de las sesiones que vencieron. */
  expire(): string[] {
    const now = this.clock();
    if (this.pending && this.pending.expiresAt <= now) this.pending = null;
    const expired: string[] = [];
    for (const [hash, session] of this.sessions) {
      if (session.expiresAt > now) continue;
      this.sessions.delete(hash);
      expired.push(session.id);
    }
    return expired;
  }

  /** Anula el QR pendiente si es el de ese token (otro QR más nuevo sigue vigente). Devuelve si lo anuló. */
  cancelPending(token: string): boolean {
    if (!this.pending || !TOKEN_PATTERN.test(token) || this.pending.hash !== hashToken(token)) return false;
    this.pending = null;
    return true;
  }

  /** ¿Queda alguna sesión vigente con la que un teléfono pueda reconectar? */
  hasSessions(): boolean {
    this.expire();
    return this.sessions.size > 0;
  }

  /** Anula el QR pendiente y todas las sesiones. */
  revokeAll(): void {
    this.pending = null;
    this.sessions.clear();
  }

  /** Anula la sesión de un teléfono. */
  revokeSession(id: string): void {
    for (const [hash, session] of this.sessions) if (session.id === id) this.sessions.delete(hash);
  }
}
