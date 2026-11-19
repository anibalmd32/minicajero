import { Database } from "bun:sqlite";
import { copyFileSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { prepareDatabasePath, resolveDataDir } from "./data-dir";
import { migrations } from "./migrations";
import { type MigrationResult, runMigrations } from "./migrator";

const BUSY_TIMEOUT_MS = 5000;
const WAL_MAX_ATTEMPTS = 10;
const WAL_RETRY_DELAY_MS = 50;

/** Información de la BD abierta al arrancar. */
export interface DatabaseInfo {
  path: string;
  migrations: MigrationResult;
}

let instance: Database | null = null;
let info: DatabaseInfo | null = null;

/** Abre una conexión SQLite con los PRAGMAs del proyecto (claves foráneas, WAL, espera ante bloqueo). */
export function openDatabase(path: string): Database {
  const db = new Database(path, { create: true, strict: true });
  db.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  db.run("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") enableWalWithRetry(db);
  db.run("PRAGMA synchronous = NORMAL");
  return db;
}

function enableWalWithRetry(db: Database): void {
  for (let attempt = 1; ; attempt++) {
    try {
      db.run("PRAGMA journal_mode = WAL");
      return;
    } catch (err) {
      if (attempt >= WAL_MAX_ATTEMPTS) throw err;
      Bun.sleepSync(WAL_RETRY_DELAY_MS * attempt);
    }
  }
}

/** Abre la BD (si no lo está ya) en la carpeta de datos y aplica las migraciones pendientes. Idempotente. */
export function initDatabase(dataDir: string = resolveDataDir()): DatabaseInfo {
  if (instance && info) return info;
  const path = prepareDatabasePath(dataDir);
  const db = openDatabase(path);
  try {
    info = { path, migrations: runMigrations(db, migrations) };
  } catch (err) {
    db.close();
    throw err;
  }
  instance = db;
  return info;
}

/** Conexión única de la aplicación. Requiere haber llamado a `initDatabase()` al arrancar. */
export function getDb(): Database {
  if (!instance) throw new Error("La base de datos no está inicializada: llama a initDatabase() al arrancar");
  return instance;
}

/** Cierra la conexión (vuelca el WAL) si está abierta. */
export function closeDatabase(): void {
  if (!instance) return;
  instance.close();
  instance = null;
  info = null;
}

/** Ruta del archivo de la BD abierta. Requiere haber llamado a `initDatabase()`. */
export function getDatabasePath(): string {
  if (!info) throw new Error("La base de datos no está inicializada: llama a initDatabase() al arrancar");
  return info.path;
}

/** Archivos auxiliares que SQLite crea junto a una BD (WAL, memoria compartida y diario). */
export function sqliteSidecarFiles(path: string): string[] {
  return [`${path}-wal`, `${path}-shm`, `${path}-journal`];
}

function removeFiles(paths: readonly string[]): void {
  for (const path of paths) rmSync(path, { force: true });
}

/**
 * Sustituye el archivo de la BD abierta por una copia de `sourcePath`: cierra la conexión, copia el archivo,
 * lo reabre y aplica las migraciones pendientes. Si la nueva BD no se puede abrir o migrar, vuelve a dejar la
 * anterior tal como estaba y relanza el error. Es síncrona para que ninguna solicitud encuentre la BD cerrada.
 */
export function replaceDatabaseFile(sourcePath: string): DatabaseInfo {
  const path = getDatabasePath();
  const dataDir = dirname(path);
  const previous = `${path}.anterior`;
  closeDatabase();
  removeFiles([previous, ...sqliteSidecarFiles(path)]);
  renameSync(path, previous);
  try {
    copyFileSync(sourcePath, path);
    const reopened = initDatabase(dataDir);
    rmSync(previous, { force: true });
    return reopened;
  } catch (err) {
    closeDatabase();
    removeFiles([path, ...sqliteSidecarFiles(path)]);
    renameSync(previous, path);
    initDatabase(dataDir);
    throw err;
  }
}
