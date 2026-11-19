/** Tiempo mínimo entre dos envíos del mismo código. */
export const SAME_CODE_COOLDOWN_MS = 2000;

/** Si el código deja de verse este tiempo, se considera que se apartó de la cámara. */
export const SAME_CODE_GAP_MS = 1200;

interface Sighting {
  seenAt: number;
  sentAt: number;
  sentWhileInView: boolean;
}

/**
 * Evita enviar varias veces el mismo código mientras sigue delante de la cámara. Un código se vuelve a
 * aceptar si dejó de verse al menos 1,2 s (se apartó y se volvió a acercar) y pasaron 2 s desde su último
 * envío; así se puede escanear el mismo producto otra vez para sumar unidades. Lleva la cuenta por código,
 * de modo que dos códigos a la vista no se envían alternadamente.
 */
export class ScanDeduplicator {
  private readonly sightings = new Map<string, Sighting>();

  constructor(
    private readonly cooldownMs = SAME_CODE_COOLDOWN_MS,
    private readonly gapMs = SAME_CODE_GAP_MS,
  ) {}

  /** Registra que se vio `code` en el instante `now` y dice si hay que enviarlo. */
  accept(code: string, now: number): boolean {
    this.forgetOld(now);
    const sighting = this.sightings.get(code);
    if (!sighting) {
      this.sightings.set(code, { seenAt: now, sentAt: now, sentWhileInView: true });
      return true;
    }
    if (now - sighting.seenAt >= this.gapMs) sighting.sentWhileInView = false;
    sighting.seenAt = now;
    if (sighting.sentWhileInView || now - sighting.sentAt < this.cooldownMs) return false;
    sighting.sentAt = now;
    sighting.sentWhileInView = true;
    return true;
  }

  /** Olvida los códigos vistos (p. ej. al pausar la cámara). */
  reset(): void {
    this.sightings.clear();
  }

  private forgetOld(now: number): void {
    const horizon = Math.max(this.cooldownMs, this.gapMs);
    for (const [code, sighting] of this.sightings) {
      if (now - sighting.seenAt >= horizon && now - sighting.sentAt >= horizon) this.sightings.delete(code);
    }
  }
}
