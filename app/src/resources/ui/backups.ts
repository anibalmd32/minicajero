import { api, apiDownload, type DownloadedFile } from "./api";
import { LOCALE } from "./format";

/** Origen de un respaldo guardado. */
export type BackupKind = "automatic" | "pre-restore";

/** Respaldo guardado en la carpeta de respaldos. */
export interface BackupFile {
  name: string;
  kind: BackupKind;
  size_bytes: number;
  created_at: string;
}

/** Respaldos guardados devueltos por `/api/v1/backup/files`. */
export interface BackupList {
  directory: string;
  retention: number;
  items: BackupFile[];
}

/** Resultado de restaurar un respaldo. */
export interface RestoreResult {
  status: "restored";
  schema_version: number;
  applied_migrations: number[];
  pre_restore_backup: BackupFile;
}

/** Descarga una copia de la base de datos actual. */
export function downloadBackup(): Promise<DownloadedFile> {
  return apiDownload("/backup", "minicajero.db");
}

/** Lista los respaldos automáticos y previos a restaurar. */
export function fetchBackups(): Promise<BackupList> {
  return api.get<BackupList>("/backup/files");
}

/** URL de descarga de un respaldo guardado. */
export function backupFileUrl(name: string): string {
  return `/api/v1/backup/files/${encodeURIComponent(name)}`;
}

/** Reemplaza todos los datos por los del archivo de respaldo. */
export function restoreBackup(file: File): Promise<RestoreResult> {
  const form = new FormData();
  form.append("file", file);
  return api.upload<RestoreResult>("/backup/restore", form);
}

const FILE_SIZE_UNITS = ["KB", "MB", "GB"];
const fileSizeFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** Tamaño de archivo legible: `512 B`, `1,5 KB`, `12,3 MB`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unit = "B";
  for (const next of FILE_SIZE_UNITS) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${fileSizeFormat.format(value)} ${unit}`;
}
