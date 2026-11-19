import { Database } from "bun:sqlite";
import { migrations } from "../../db/migrations";
import { BadRequestError } from "../../lib/http-errors";

const SQLITE_HEADER = "SQLite format 3\0";

export function hasSqliteHeader(bytes: Uint8Array): boolean {
  return new TextDecoder("latin1").decode(bytes.subarray(0, SQLITE_HEADER.length)) === SQLITE_HEADER;
}

export function invalidFile(reason: string): BadRequestError {
  return new BadRequestError(`El archivo no es un respaldo válido de MiniCajero: ${reason}`);
}

function checkIntegrity(db: Database): void {
  const rows = db.query<{ integrity_check: string }, []>("PRAGMA integrity_check").all();
  if (rows.length !== 1 || rows[0]?.integrity_check !== "ok") throw invalidFile("la base de datos está dañada");
}

function checkMigrations(db: Database): void {
  const table = db
    .query<{ found: number }, []>(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
    )
    .get();
  if (!table) throw invalidFile("no tiene el registro de versiones de la aplicación");
  const applied = db.query<{ version: number; name: string }, []>("SELECT version, name FROM schema_migrations").all();
  const knownNames = new Map(migrations.map((migration) => [migration.version, migration.name]));
  const first = applied.find((row) => row.version === migrations[0]?.version);
  if (!first || first.name !== knownNames.get(first.version)) throw invalidFile("no fue creado por esta aplicación");
  if (applied.some((row) => !knownNames.has(row.version))) {
    throw new BadRequestError(
      "El respaldo fue creado por una versión más nueva de MiniCajero. Actualiza la aplicación para restaurarlo.",
    );
  }
}

function openReadonly(path: string): Database {
  try {
    return new Database(path, { readonly: true, strict: true });
  } catch {
    throw invalidFile("no se pudo abrir como base de datos SQLite");
  }
}

/** Comprueba que el archivo sea una BD SQLite íntegra creada por esta aplicación (y no por una versión más nueva). Lanza 400 si no. */
export function validateBackupFile(path: string): void {
  const db = openReadonly(path);
  try {
    checkIntegrity(db);
    checkMigrations(db);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    throw invalidFile("no es una base de datos SQLite legible");
  } finally {
    db.close();
  }
}
