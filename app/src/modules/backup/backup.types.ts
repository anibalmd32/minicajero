/** Carpeta de respaldos dentro de la carpeta de datos. */
export const BACKUPS_DIR_NAME = "backups";

/** Cuántos respaldos de cada tipo se conservan en la carpeta de respaldos. */
export const BACKUP_RETENTION = 14;

/** Tamaño máximo aceptado para un archivo a restaurar (512 MiB). */
export const MAX_RESTORE_BYTES = 512 * 1024 * 1024;

/** Tipo MIME con el que se descargan los respaldos. */
export const BACKUP_CONTENT_TYPE = "application/vnd.sqlite3";

/** Origen de un respaldo guardado: el diario automático o el que se hace justo antes de restaurar. */
export type BackupKind = "automatic" | "pre-restore";

/** Respaldo guardado en la carpeta de respaldos. */
export interface BackupFile {
  name: string;
  kind: BackupKind;
  size_bytes: number;
  created_at: string;
}

/** Respaldos guardados y dónde están. */
export interface BackupList {
  directory: string;
  retention: number;
  items: BackupFile[];
}

/** Resultado de una restauración. */
export interface RestoreResult {
  status: "restored";
  schema_version: number;
  applied_migrations: number[];
  pre_restore_backup: BackupFile;
}
