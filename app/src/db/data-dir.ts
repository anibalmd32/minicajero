import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** Variable de entorno que fuerza la carpeta de datos. */
export const DATA_DIR_ENV = "MINICAJERO_DATA_DIR";

/** Nombre del archivo de base de datos dentro de la carpeta de datos. */
export const DATABASE_FILE = "minicajero.db";

/** Nombre de la carpeta de datos del usuario cuando no se puede escribir junto al ejecutable. */
export const USER_DATA_DIR_NAME = "MiniCajero";

const DATA_DIR_NAME = "data";
const COMPILED_MAIN = /^(\/\$bunfs\/|[A-Za-z]:[\\/]~BUN[\\/])/;

/** Contexto del proceso necesario para decidir la carpeta de datos. */
export interface RuntimeContext {
  env: Record<string, string | undefined>;
  main: string;
  execPath: string;
  cwd: string;
  platform: NodeJS.Platform;
  homeDir: string;
  isWritableDir: (dir: string) => boolean;
}

/** ¿Se puede crear (si falta) y escribir en la carpeta? Lo comprueba creando y borrando un archivo de prueba. */
export function isWritableDir(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, `.escritura-${process.pid}-${Date.now()}`);
    writeFileSync(probe, "");
    rmSync(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

function currentRuntime(): RuntimeContext {
  return {
    env: process.env,
    main: Bun.main,
    execPath: process.execPath,
    cwd: process.cwd(),
    platform: process.platform,
    homeDir: homedir(),
    isWritableDir,
  };
}

/** ¿Se ejecuta como binario compilado con `bun build --compile`? (el punto de entrada vive en el FS virtual de Bun). */
export function isCompiledBinary(main: string = Bun.main): boolean {
  return COMPILED_MAIN.test(main);
}

/**
 * Carpeta de datos del usuario según el sistema: `%LOCALAPPDATA%\MiniCajero` en Windows,
 * `~/Library/Application Support/MiniCajero` en macOS y `$XDG_DATA_HOME/MiniCajero`
 * (o `~/.local/share/MiniCajero`) en Linux.
 */
export function userDataDir(ctx: Pick<RuntimeContext, "env" | "platform" | "homeDir">): string {
  const { env, platform, homeDir } = ctx;
  if (platform === "win32") {
    const base = env.LOCALAPPDATA?.trim() || join(homeDir, "AppData", "Local");
    return join(base, USER_DATA_DIR_NAME);
  }
  if (platform === "darwin") return join(homeDir, "Library", "Application Support", USER_DATA_DIR_NAME);
  const base = env.XDG_DATA_HOME?.trim() || join(homeDir, ".local", "share");
  return join(base, USER_DATA_DIR_NAME);
}

/**
 * Carpeta de datos: `MINICAJERO_DATA_DIR` si está definida; en binario compilado, `data` junto al
 * ejecutable si se puede escribir ahí y, si no (p. ej. en Program Files), la carpeta de datos del usuario;
 * en desarrollo, `./data` relativo al cwd.
 */
export function resolveDataDir(ctx: RuntimeContext = currentRuntime()): string {
  const fromEnv = ctx.env[DATA_DIR_ENV]?.trim();
  if (fromEnv) return resolve(ctx.cwd, fromEnv);
  if (!isCompiledBinary(ctx.main)) return resolve(ctx.cwd, DATA_DIR_NAME);
  const besideExecutable = resolve(dirname(ctx.execPath), DATA_DIR_NAME);
  return ctx.isWritableDir(besideExecutable) ? besideExecutable : userDataDir(ctx);
}

/** Ruta absoluta del archivo SQLite, creando la carpeta de datos si no existe. */
export function prepareDatabasePath(dataDir: string = resolveDataDir()): string {
  mkdirSync(dataDir, { recursive: true });
  return resolve(dataDir, DATABASE_FILE);
}
