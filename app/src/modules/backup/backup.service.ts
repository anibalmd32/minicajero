import { getDb } from "../../db/connection";
import { BACKUP_RETENTION, type BackupList } from "./backup.types";
import { listBackupFiles } from "./backup-files";
import { backupFileName, currentBackupsDir } from "./backup-names";
import { databaseSnapshotBytes } from "./backup-snapshot";

export {
  BACKUP_CONTENT_TYPE,
  BACKUP_RETENTION,
  BACKUPS_DIR_NAME,
  type BackupFile,
  type BackupKind,
  type BackupList,
  MAX_RESTORE_BYTES,
  type RestoreResult,
} from "./backup.types";
export {
  createBackup,
  lastAutomaticBackupAt,
  listBackupFiles,
  pruneBackups,
  resolveBackupFile,
  runAutomaticBackupIfDue,
} from "./backup-files";
export { backupFileName, backupsDirFor, backupTimestamp, currentBackupsDir } from "./backup-names";
export { restoreDatabase } from "./backup-restore";
export { databaseSnapshotBytes, writeDatabaseSnapshot } from "./backup-snapshot";
export { validateBackupFile } from "./backup-validation";

/** Respaldos guardados de la BD abierta. */
export function getBackupList(): BackupList {
  const directory = currentBackupsDir();
  return { directory, retention: BACKUP_RETENTION, items: listBackupFiles(directory) };
}

/** Copia consistente de la BD abierta con su nombre de descarga. */
export function createDownloadBackup(now: Date = new Date()): { fileName: string; bytes: Uint8Array<ArrayBuffer> } {
  return { fileName: backupFileName(now), bytes: databaseSnapshotBytes(getDb(), currentBackupsDir()) };
}
