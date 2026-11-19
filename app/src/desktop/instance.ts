import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ID } from "../lib/version";

/** Nombre del archivo, dentro de la carpeta de datos, donde se recuerda el puerto en uso. */
export const PORT_FILE_NAME = "puerto.txt";

const HEALTH_TIMEOUT_MS = 1500;
const CONNECT_TIMEOUT_MS = 1000;
const LOOPBACK_HOSTS = ["127.0.0.1", "::1"];
const LOOPBACK_URL_HOSTS = ["127.0.0.1", "[::1]"];
const PORT_TEXT = /^\d{1,5}$/;

/** Ruta del archivo de puerto para una carpeta de datos. */
export function portFilePath(dataDir: string): string {
  return join(dataDir, PORT_FILE_NAME);
}

/** Lee el puerto guardado; `null` si no existe o su contenido no es un puerto válido. */
export function readSavedPort(path: string): number | null {
  let text: string;
  try {
    text = readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
  if (!PORT_TEXT.test(text)) return null;
  const port = Number(text);
  return port >= 1 && port <= 65535 ? port : null;
}

/** Guarda el puerto elegido para que las próximas ejecuciones lo encuentren. */
export function savePort(path: string, port: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${port}\n`);
}

/** URL local de la aplicación en un puerto. */
export function localUrl(port: number): string {
  return `http://localhost:${port}/`;
}

/**
 * ¿Hay una instancia de MiniCajero respondiendo en el puerto? Consulta `/api/v1/health` por IPv4
 * y por IPv6 (otro programa puede ocupar solo una de las dos) y exige que se identifique como esta aplicación.
 */
export async function isMiniCajeroRunning(port: number, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const answers = await Promise.all(LOOPBACK_URL_HOSTS.map((host) => healthIdentifiesApp(host, port, fetchFn)));
  return answers.includes(true);
}

/** ¿Algún programa acepta conexiones TCP en el puerto, por 127.0.0.1 o por ::1? */
export async function isPortInUse(port: number): Promise<boolean> {
  const answers = await Promise.all(LOOPBACK_HOSTS.map((hostname) => acceptsConnections(hostname, port)));
  return answers.includes(true);
}

function acceptsConnections(hostname: string, port: number): Promise<boolean> {
  const attempt = new Promise<boolean>((resolve) => {
    Bun.connect({
      hostname,
      port,
      socket: {
        open(socket) {
          socket.end();
          resolve(true);
        },
        data() {},
        error: () => resolve(false),
        connectError: () => resolve(false),
      },
    }).catch(() => resolve(false));
  });
  const timeout = Bun.sleep(CONNECT_TIMEOUT_MS).then(() => false);
  return Promise.race([attempt, timeout]);
}

async function healthIdentifiesApp(host: string, port: number, fetchFn: typeof fetch): Promise<boolean> {
  try {
    const response = await fetchFn(`http://${host}:${port}/api/v1/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && (body as { app?: unknown }).app === APP_ID;
  } catch {
    return false;
  }
}
