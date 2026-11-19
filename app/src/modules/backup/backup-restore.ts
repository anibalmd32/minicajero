import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type DatabaseInfo, getDb, replaceDatabaseFile } from "../../db/connection";
import { BadRequestError } from "../../lib/http-errors";
import { MAX_RESTORE_BYTES, type RestoreResult } from "./backup.types";
import { publishSnapshot, writePendingSnapshot } from "./backup-files";
import { currentBackupsDir } from "./backup-names";
import { removeWithSidecars } from "./backup-snapshot";
import { hasSqliteHeader, invalidFile, validateBackupFile } from "./backup-validation";

function assertRestorableBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new BadRequestError("El archivo está vacío");
  if (bytes.byteLength > MAX_RESTORE_BYTES)
    throw new BadRequestError("El archivo es demasiado grande para ser un respaldo");
  if (!hasSqliteHeader(bytes)) throw invalidFile("no es una base de datos SQLite");
}

function stageUpload(upload: string, bytes: Uint8Array): void {
  writeFileSync(upload, bytes);
  validateBackupFile(upload);
  rmSync(`${upload}-wal`, { force: true });
  rmSync(`${upload}-shm`, { force: true });
}

function reopenWith(upload: string): DatabaseInfo {
  try {
    return replaceDatabaseFile(upload);
  } catch (err) {
    throw new BadRequestError(
      `No se pudo abrir el respaldo; se mantienen los datos actuales. ${(err as Error).message}`,
    );
  }
}

/**
 * Restaura la BD desde los bytes de un respaldo: lo valida, copia la BD actual, reemplaza el archivo,
 * reabre la conexión y aplica las migraciones pendientes. La copia de la BD actual solo se guarda como
 * respaldo previo si la restauración termina bien; si no, la BD actual queda intacta y responde 400.
 */
export function restoreDatabase(bytes: Uint8Array, now: Date = new Date()): RestoreResult {
  assertRestorableBytes(bytes);
  const dir = currentBackupsDir();
  mkdirSync(dir, { recursive: true });
  const upload = join(dir, `.restaurar-${crypto.randomUUID()}.db`);
  let pending: string | null = null;
  try {
    stageUpload(upload, bytes);
    pending = writePendingSnapshot(getDb(), dir);
    const reopened = reopenWith(upload);
    return {
      status: "restored",
      schema_version: reopened.migrations.currentVersion,
      applied_migrations: reopened.migrations.applied,
      pre_restore_backup: publishSnapshot(pending, dir, "pre-restore", now),
    };
  } finally {
    removeWithSidecars(upload);
    if (pending) removeWithSidecars(pending);
  }
}
