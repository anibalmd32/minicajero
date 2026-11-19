import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { getDatabasePath } from "../../db/connection";
import { BUSINESS_UTC_OFFSET_HOURS } from "../../lib/dates";
import { BACKUPS_DIR_NAME, type BackupKind } from "./backup.types";

const FILE_PREFIX = "minicajero-";
const PRE_RESTORE_TAG = "antes-de-restaurar-";
const HOUR_MS = 60 * 60 * 1000;
const MAX_SAME_MINUTE_FILES = 999;

export const BACKUP_FILE_PATTERN = /^minicajero-(antes-de-restaurar-)?\d{4}-\d{2}-\d{2}-\d{4}(-\d{1,3})?\.db$/;

/** Carpeta de respaldos de una carpeta de datos. */
export function backupsDirFor(dataDir: string): string {
  return join(dataDir, BACKUPS_DIR_NAME);
}

/** Carpeta de respaldos de la BD abierta. */
export function currentBackupsDir(): string {
  return backupsDirFor(dirname(getDatabasePath()));
}

/** Fecha y hora local del negocio en formato `AAAA-MM-DD-HHmm` para nombres de archivo. */
export function backupTimestamp(now: Date): string {
  const local = new Date(now.getTime() + BUSINESS_UTC_OFFSET_HOURS * HOUR_MS).toISOString();
  return `${local.slice(0, 10)}-${local.slice(11, 13)}${local.slice(14, 16)}`;
}

/** Nombre de archivo de un respaldo: `minicajero-AAAA-MM-DD-HHmm.db` (con `antes-de-restaurar-` si es previo a restaurar). */
export function backupFileName(now: Date, kind: BackupKind = "automatic"): string {
  const tag = kind === "pre-restore" ? PRE_RESTORE_TAG : "";
  return `${FILE_PREFIX}${tag}${backupTimestamp(now)}.db`;
}

export function backupKindOf(name: string): BackupKind {
  return name.startsWith(`${FILE_PREFIX}${PRE_RESTORE_TAG}`) ? "pre-restore" : "automatic";
}

export function uniqueBackupPath(dir: string, name: string): string {
  const base = name.slice(0, -".db".length);
  for (let copy = 1; copy <= MAX_SAME_MINUTE_FILES; copy++) {
    const candidate = join(dir, copy === 1 ? name : `${base}-${copy}.db`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Demasiados respaldos con el nombre ${name}`);
}
