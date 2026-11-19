/** Espera antes de cada reintento de conexión (1 s, 2 s, 4 s, 8 s y luego cada 15 s). */
export const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const;

/** Espera para el reintento número `attempt` (desde 0). */
export function reconnectDelay(attempt: number): number {
  const index = Math.min(Math.max(0, Math.floor(attempt)), RECONNECT_DELAYS_MS.length - 1);
  return RECONNECT_DELAYS_MS[index] ?? RECONNECT_DELAYS_MS[0];
}

/** Tiempo sin conexión tras el que se sugiere revisar el Wi-Fi o volver a escanear el código (sin dejar de reintentar). */
export const LINK_STALLED_AFTER_MS = 60_000;

/** ¿Lleva la conexión perdida tanto tiempo que conviene orientar al usuario? */
export function isLinkStalled(lostSince: number, now: number): boolean {
  return now - lostSince >= LINK_STALLED_AFTER_MS;
}
