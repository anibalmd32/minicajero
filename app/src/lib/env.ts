/** Puerto HTTP por defecto. */
export const DEFAULT_PORT = 4000;

const DECIMAL_PORT = /^\d{1,5}$/;

/** Lee el puerto de `PORT` (entero decimal 1-65535); si falta usa 4000 y si es inválido aborta con un mensaje claro. */
export function readPort(raw: string | undefined = process.env.PORT): number {
  const text = raw?.trim() ?? "";
  if (text === "") return DEFAULT_PORT;
  const port = DECIMAL_PORT.test(text) ? Number(text) : NaN;
  if (!(port >= 1 && port <= 65535)) {
    throw new Error(`Variable PORT inválida: "${raw}". Debe ser un entero entre 1 y 65535.`);
  }
  return port;
}
