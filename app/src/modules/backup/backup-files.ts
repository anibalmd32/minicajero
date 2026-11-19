import type { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { NotFoundError } from "../../lib/http-errors";
import { BACKUP_RETENTION, type BackupFile, type BackupKind } from "./backup.types";
import { BACKUP_FILE_PATTERN, backupFileName, backupKindOf, uniqueBackupPath } from "./backup-names";
import { removeWithSidecars, writeDatabaseSnapshot } from "./backup-snapshot";

function toBackupFile(dir: string, name: string): BackupFile {
  const stats = statSync(join(dir, name));
  return { name, kind: backupKindOf(name), size_bytes: stats.size, created_at: stats.mtime.toISOString() };
}

function newestFirst(a: BackupFile, b: BackupFile): number {
  return b.created_at.localeCompare(a.created_at) || b.name.localeCompare(a.name);
}

/** Respaldos guardados en `dir`, del más reciente al más antiguo. Ignora cualquier otro archivo. */
export function listBackupFiles(dir: string): BackupFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => BACKUP_FILE_PATTERN.test(name))
    .map((name) => toBackupFile(dir, name))
    .sort(newestFirst);
}

/** Borra los respaldos de ese tipo que excedan `keep`, empezando por los más antiguos. Devuelve los nombres borrados. */
export function pruneBackups(dir: string, kind: BackupKind, keep: number = BACKUP_RETENTION): string[] {
  const excess = listBackupFiles(dir)
    .filter((file) => file.kind === kind)
    .slice(keep);
  for (const file of excess) rmSync(join(dir, file.name), { force: true });
  return excess.map((file) => file.name);
}

export function writePendingSnapshot(db: Database, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const pending = join(dir, `.pendiente-${crypto.randomUUID()}.db`);
  writeDatabaseSnapshot(db, pending);
  return pending;
}

export function publishSnapshot(pending: string, dir: string, kind: BackupKind, now: Date): BackupFile {
  const path = uniqueBackupPath(dir, backupFileName(now, kind));
  renameSync(pending, path);
  pruneBackups(dir, kind);
  return toBackupFile(dir, path.slice(dir.length + 1));
}

/** Guarda un respaldo de la BD en `dir` y aplica la retención de su tipo. */
export function createBackup(db: Database, dir: string, kind: BackupKind, now: Date = new Date()): BackupFile {
  const pending = writePendingSnapshot(db, dir);
  try {
    return publishSnapshot(pending, dir, kind, now);
  } finally {
    removeWithSidecars(pending);
  }
}

/** Fecha del respaldo automático más reciente, o `null` si no hay ninguno. */
export function lastAutomaticBackupAt(dir: string): Date | null {
  const latest = listBackupFiles(dir).find((file) => file.kind === "automatic");
  return latest ? new Date(latest.created_at) : null;
}

/** Hace el respaldo automático si nunca se hizo o si el último tiene al menos `intervalMs`. Devuelve el respaldo creado o `null`. */
export function runAutomaticBackupIfDue(
  db: Database,
  dir: string,
  intervalMs: number,
  now: Date = new Date(),
): BackupFile | null {
  const last = lastAutomaticBackupAt(dir);
  if (last && now.getTime() - last.getTime() < intervalMs) return null;
  return createBackup(db, dir, "automatic", now);
}

/** Ruta de un respaldo guardado por su nombre. 404 si el nombre no es de un respaldo o no existe. */
export function resolveBackupFile(dir: string, name: string): string {
  const path = join(dir, name);
  if (!BACKUP_FILE_PATTERN.test(name) || !existsSync(path)) throw new NotFoundError("No se encontró ese respaldo");
  return path;
}
