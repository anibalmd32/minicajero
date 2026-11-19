import { expect, test } from "bun:test";
import {
  FAILED_ATTEMPTS_WINDOW_MS,
  generateToken,
  MAX_FAILED_ATTEMPTS_PER_IP,
  MAX_FAILED_ATTEMPTS_TOTAL,
  PairingRegistry,
} from "./pairing";
import { fakeClock, pairPhone } from "./pairing.test-support";

function failRedeems(registry: PairingRegistry, count: number, ip: (attempt: number) => string): void {
  for (let attempt = 0; attempt < count; attempt++) registry.redeem(generateToken(), ip(attempt));
}

test("bloquea una IP tras varios intentos fallidos, aunque luego traiga el token correcto", () => {
  const registry = new PairingRegistry(fakeClock().now);
  const { token } = registry.createPairing();
  for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS_PER_IP; attempt++) {
    expect(registry.redeem(generateToken(), "192.168.1.66")).toEqual({ ok: false, reason: "invalid" });
  }
  expect(registry.redeem("corto", "192.168.1.66")).toEqual({ ok: false, reason: "locked" });
  expect(registry.redeem(token, "192.168.1.66")).toEqual({ ok: false, reason: "locked" });
  expect(registry.redeem(token, "192.168.1.20").ok).toBe(true);
});

test("el bloqueo por IP se levanta al pasar la ventana", () => {
  const clock = fakeClock();
  const registry = new PairingRegistry(clock.now);
  const session = pairPhone(registry);
  failRedeems(registry, MAX_FAILED_ATTEMPTS_PER_IP, () => "192.168.1.66");
  expect(registry.isLocked("192.168.1.66")).toBe(true);
  clock.advance(FAILED_ATTEMPTS_WINDOW_MS / 2);
  expect(registry.redeem(session.token, "192.168.1.66")).toEqual({ ok: false, reason: "locked" });
  clock.advance(FAILED_ATTEMPTS_WINDOW_MS / 2);
  expect(registry.isLocked("192.168.1.66")).toBe(false);
  expect(registry.redeem(session.token, "192.168.1.66").ok).toBe(true);
});

test("un QR nuevo desde la PC desbloquea las IP", () => {
  const registry = new PairingRegistry(fakeClock().now);
  registry.createPairing();
  failRedeems(registry, MAX_FAILED_ATTEMPTS_PER_IP, () => "192.168.1.108");
  expect(registry.isLocked("192.168.1.108")).toBe(true);
  const { token } = registry.createPairing();
  expect(registry.isLocked("192.168.1.108")).toBe(false);
  expect(registry.redeem(token, "192.168.1.108").ok).toBe(true);
});

test("demasiados fallos en total anulan el QR pendiente", () => {
  const registry = new PairingRegistry(fakeClock().now);
  const { token } = registry.createPairing();
  failRedeems(registry, MAX_FAILED_ATTEMPTS_TOTAL, (attempt) => `10.0.0.${attempt}`);
  expect(registry.pendingExpiresAt()).toBeNull();
  expect(registry.redeem(token, "192.168.1.20").ok).toBe(false);
});
