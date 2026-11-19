import { appendFileSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

/** Tamaño a partir del cual se rota el log (1 MiB). */
export const LOG_MAX_BYTES = 1024 * 1024;

/** Cantidad de archivos antiguos que se conservan (`.1` es el más reciente). */
export const LOG_BACKUPS = 3;

/** Nombre del archivo de log dentro de la carpeta `logs` de la carpeta de datos. */
export const LOG_FILE_NAME = "minicajero.log";

/** Nivel de una línea de log. */
export type LogLevel = "INFO" | "WARN" | "ERROR";

/** Opciones del log a archivo. */
export interface FileLogOptions {
  path: string;
  maxBytes?: number;
  backups?: number;
  now?: () => Date;
}

/** Log a archivo con rotación por tamaño. */
export interface FileLog {
  readonly path: string;
  write(level: LogLevel, message: string): void;
}

/** Ruta del archivo de log para una carpeta de datos. */
export function logFilePath(dataDir: string): string {
  return join(dataDir, "logs", LOG_FILE_NAME);
}

function currentSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function rotate(path: string, backups: number): void {
  rmSync(`${path}.${backups}`, { force: true });
  for (let index = backups - 1; index >= 1; index--) {
    try {
      renameSync(`${path}.${index}`, `${path}.${index + 1}`);
    } catch {}
  }
  if (backups > 0) renameSync(path, `${path}.1`);
  else rmSync(path, { force: true });
}

/**
 * Crea un log que añade líneas `fecha nivel mensaje` al archivo. Cuando la siguiente línea haría
 * superar `maxBytes`, renombra el archivo a `.1` (desplazando los anteriores hasta `backups`) y empieza
 * uno nuevo. Nunca lanza: si el disco falla, la línea se pierde pero la aplicación sigue.
 */
export function createFileLog({
  path,
  maxBytes = LOG_MAX_BYTES,
  backups = LOG_BACKUPS,
  now = () => new Date(),
}: FileLogOptions): FileLog {
  mkdirSync(dirname(path), { recursive: true });
  let size = currentSize(path);
  return {
    path,
    write(level, message) {
      const line = `${now().toISOString()} ${level.padEnd(5)} ${message}\n`;
      const bytes = Buffer.byteLength(line);
      try {
        if (size > 0 && size + bytes > maxBytes) {
          rotate(path, backups);
          size = 0;
        }
        appendFileSync(path, line);
        size += bytes;
      } catch {
        size = currentSize(path);
      }
    },
  };
}

function formatArgs(args: unknown[]): string {
  return args.map((arg) => (typeof arg === "string" ? arg : Bun.inspect(arg))).join(" ");
}

/** Redirige `console.log/info/warn/error` al log (el binario no tiene consola). */
export function redirectConsoleToLog(log: FileLog): void {
  console.log = (...args: unknown[]) => log.write("INFO", formatArgs(args));
  console.info = console.log;
  console.warn = (...args: unknown[]) => log.write("WARN", formatArgs(args));
  console.error = (...args: unknown[]) => log.write("ERROR", formatArgs(args));
}
