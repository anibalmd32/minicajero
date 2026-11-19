/** Reloj inyectable (milisegundos desde la época). */
export type Clock = () => number;

/** Cuenta intentos fallidos por clave dentro de una ventana deslizante. */
export class AttemptLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: Clock,
  ) {}

  private recent(key: string): number[] {
    const since = this.clock() - this.windowMs;
    const kept = (this.failures.get(key) ?? []).filter((at) => at > since);
    if (kept.length > 0) this.failures.set(key, kept);
    else this.failures.delete(key);
    return kept;
  }

  isLocked(key: string): boolean {
    return this.recent(key).length >= this.limit;
  }

  /** Registra un fallo y devuelve si con él la clave queda bloqueada. */
  recordFailure(key: string): boolean {
    const attempts = this.recent(key);
    attempts.push(this.clock());
    this.failures.set(key, attempts);
    return attempts.length >= this.limit;
  }

  reset(): void {
    this.failures.clear();
  }
}
