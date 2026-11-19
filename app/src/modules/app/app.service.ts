import { basename } from "node:path";
import { APP_NAME, APP_VERSION } from "../../lib/version";

/** Datos del proceso en ejecución que se muestran en Configuración → Aplicación. */
export interface AppRuntime {
  dataDir: string;
  databasePath: string;
  logPath: string | null;
  port: number;
  desktop: boolean;
  executablePath: string | null;
}

/** Información de la aplicación devuelta por `GET /api/v1/app`. */
export interface AppInfo {
  name: string;
  version: string;
  desktop: boolean;
  executable: string | null;
  dataDir: string;
  databasePath: string;
  logPath: string | null;
  port: number;
}

/** Retardo antes de cerrar para que la respuesta HTTP llegue al navegador. */
export const SHUTDOWN_DELAY_MS = 250;

let runtime: AppRuntime | null = null;
let shutdownHandler: (() => void) | null = null;
let shutdownScheduled = false;

/** Registra los datos del proceso al arrancar. */
export function configureAppRuntime(info: AppRuntime): void {
  runtime = info;
}

/** Registra la función que cierra la BD y termina el proceso. */
export function onShutdownRequested(handler: () => void): void {
  shutdownHandler = handler;
  shutdownScheduled = false;
}

/** Versión, rutas y modo de ejecución de la aplicación. */
export function getAppInfo(): AppInfo {
  if (!runtime) throw new Error("La aplicación no registró sus datos de arranque");
  return {
    name: APP_NAME,
    version: APP_VERSION,
    desktop: runtime.desktop,
    executable: runtime.executablePath ? basename(runtime.executablePath) : null,
    dataDir: runtime.dataDir,
    databasePath: runtime.databasePath,
    logPath: runtime.logPath,
    port: runtime.port,
  };
}

/**
 * Programa el cierre de la aplicación tras `delayMs` (una sola vez aunque se pida varias).
 * Devuelve `false` si no hay manejador de cierre registrado.
 */
export function requestShutdown(delayMs: number = SHUTDOWN_DELAY_MS): boolean {
  const handler = shutdownHandler;
  if (!handler) return false;
  if (shutdownScheduled) return true;
  shutdownScheduled = true;
  setTimeout(handler, delayMs);
  return true;
}
