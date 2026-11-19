/** Cantidad de puertos consecutivos que se prueban si el preferido está ocupado por otro programa. */
export const PORT_SEARCH_SIZE = 10;

/** Dependencias del arranque (inyectables para pruebas). */
export interface LaunchOptions<S> {
  preferredPort: number;
  searchSize: number;
  isRunning: (port: number) => Promise<boolean>;
  isPortInUse: (port: number) => Promise<boolean>;
  listen: (port: number) => S;
  onPortBusy?: (port: number) => void;
}

/** Resultado del arranque: ya había una instancia o se levantó el servidor. */
export type LaunchResult<S> = { kind: "existing"; port: number } | { kind: "started"; port: number; server: S };

/** Error de arranque cuando no queda ningún puerto libre en el rango. */
export class NoFreePortError extends Error {
  constructor(first: number, last: number) {
    super(
      first === last
        ? `El puerto ${first} está ocupado por otro programa: ciérralo o define otro PORT.`
        : `No hay ningún puerto libre entre ${first} y ${last}: cierra el programa que los ocupa o define otro PORT.`,
    );
    this.name = "NoFreePortError";
  }
}

/** ¿El error indica que el puerto ya está en uso? */
export function isAddressInUse(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "EADDRINUSE";
}

/** Puertos a probar: desde el preferido, `size` consecutivos sin pasar de 65535. */
export function candidatePorts(preferred: number, size: number): number[] {
  const last = Math.min(65535, preferred + Math.max(1, size) - 1);
  const ports: number[] = [];
  for (let port = preferred; port <= last; port++) ports.push(port);
  return ports;
}

/**
 * Recorre los puertos candidatos: si en uno ya responde MiniCajero lo reutiliza; si otro programa
 * acepta conexiones en él pasa al siguiente (en Windows escuchar en un puerto ocupado no siempre
 * falla con `EADDRINUSE`); si está libre, escucha en él.
 */
export async function launch<S>(options: LaunchOptions<S>): Promise<LaunchResult<S>> {
  const ports = candidatePorts(options.preferredPort, options.searchSize);
  for (const port of ports) {
    if (await options.isRunning(port)) return { kind: "existing", port };
    if (await options.isPortInUse(port)) {
      options.onPortBusy?.(port);
      continue;
    }
    try {
      return { kind: "started", port, server: options.listen(port) };
    } catch (err) {
      if (!isAddressInUse(err)) throw err;
      options.onPortBusy?.(port);
    }
  }
  throw new NoFreePortError(ports[0] ?? options.preferredPort, ports.at(-1) ?? options.preferredPort);
}
