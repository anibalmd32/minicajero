import { expect, test } from "bun:test";
import { AttemptLimiter, generateToken, PAIRING_TTL_MS, PairingRegistry, SESSION_TTL_MS } from "./pairing";
import { fakeClock, pairPhone } from "./pairing.test-support";

test("tokens: 32 bytes aleatorios en base64url", () => {
  const tokens = new Set(Array.from({ length: 50 }, generateToken));
  expect(tokens.size).toBe(50);
  for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test("el token del QR se canjea una sola vez por una sesión", () => {
  const clock = fakeClock();
  const registry = new PairingRegistry(clock.now);
  const { token, expiresAt } = registry.createPairing();
  expect(expiresAt).toBe(clock.now() + PAIRING_TTL_MS);

  const first = registry.redeem(token, "192.168.1.20");
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.resumed).toBe(false);
  expect(first.session.token).not.toBe(token);
  expect(registry.pendingExpiresAt()).toBeNull();

  expect(registry.redeem(token, "192.168.1.20")).toEqual({ ok: false, reason: "invalid" });
});

test("el token del QR vence a los 10 minutos", () => {
  const clock = fakeClock();
  const registry = new PairingRegistry(clock.now);
  const { token } = registry.createPairing();
  clock.advance(PAIRING_TTL_MS);
  expect(registry.pendingExpiresAt()).toBeNull();
  expect(registry.redeem(token, "192.168.1.20").ok).toBe(false);
});

test("un QR nuevo anula el anterior pero conserva las sesiones", () => {
  const registry = new PairingRegistry(fakeClock().now);
  const paired = pairPhone(registry);
  const replaced = registry.createPairing();
  registry.createPairing();
  expect(registry.redeem(replaced.token, "192.168.1.21").ok).toBe(false);
  expect(registry.redeem(paired.token, "192.168.1.20")).toMatchObject({ ok: true, resumed: true });
});

test("cancelar anula solo el QR de ese token", () => {
  const registry = new PairingRegistry(fakeClock().now);
  const old = registry.createPairing();
  const current = registry.createPairing();
  expect(registry.cancelPending(old.token)).toBe(false);
  expect(registry.cancelPending("x")).toBe(false);
  expect(registry.pendingExpiresAt()).not.toBeNull();
  expect(registry.hasSessions()).toBe(false);
  expect(registry.cancelPending(current.token)).toBe(true);
  expect(registry.pendingExpiresAt()).toBeNull();
  expect(registry.redeem(current.token, "192.168.1.20").ok).toBe(false);
});

test("la sesión permite reconectar hasta 12 horas", () => {
  const clock = fakeClock();
  const registry = new PairingRegistry(clock.now);
  const session = pairPhone(registry);
  clock.advance(SESSION_TTL_MS - 1);
  expect(registry.redeem(session.token, "192.168.1.20")).toMatchObject({
    ok: true,
    resumed: true,
    session: { id: session.id },
  });
  clock.advance(1);
  expect(registry.expire()).toEqual([session.id]);
  expect(registry.redeem(session.token, "192.168.1.20").ok).toBe(false);
});

test("anular todo invalida QR y sesiones", () => {
  const registry = new PairingRegistry(fakeClock().now);
  const session = pairPhone(registry);
  const pending = registry.createPairing();
  registry.revokeAll();
  expect(registry.redeem(session.token, "192.168.1.20").ok).toBe(false);
  expect(registry.redeem(pending.token, "192.168.1.20").ok).toBe(false);
});

test("el limitador de intentos cuenta solo los fallos dentro de la ventana", () => {
  const clock = fakeClock();
  const limiter = new AttemptLimiter(2, 1000, clock.now);
  expect(limiter.recordFailure("a")).toBe(false);
  clock.advance(600);
  expect(limiter.recordFailure("a")).toBe(true);
  expect(limiter.isLocked("b")).toBe(false);
  clock.advance(500);
  expect(limiter.isLocked("a")).toBe(false);
});
