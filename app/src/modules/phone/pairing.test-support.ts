import type { PairingRegistry, PhoneSession } from "./pairing";

export function fakeClock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

export function pairPhone(registry: PairingRegistry, ip = "192.168.1.20"): PhoneSession {
  const result = registry.redeem(registry.createPairing().token, ip);
  if (!result.ok) throw new Error("debía emparejar");
  return result.session;
}
