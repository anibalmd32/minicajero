import { getDb } from "../../db/connection";
import { backupsDirFor, runAutomaticBackupIfDue } from "./backup.service";

/** Cada cuánto se hace el respaldo automático (24 h). */
export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Cada cuánto se comprueba si toca respaldo (1 h), para no depender de que el equipo esté encendido 24 h seguidas. */
export const AUTO_BACKUP_CHECK_MS = 60 * 60 * 1000;

/** Opciones del respaldo automático. */
export interface BackupSchedulerOptions {
  dataDir: string;
  intervalMs?: number;
  checkEveryMs?: number;
}

/**
 * Respaldo automático diario en `<datos>/backups`: al arrancar (sin bloquear) hace uno si el último tiene 24 h o más,
 * y luego lo vuelve a comprobar cada hora. Devuelve una función para detenerlo.
 */
export function startBackupScheduler({
  dataDir,
  intervalMs = AUTO_BACKUP_INTERVAL_MS,
  checkEveryMs = AUTO_BACKUP_CHECK_MS,
}: BackupSchedulerOptions): () => void {
  const dir = backupsDirFor(dataDir);
  const run = (): void => {
    try {
      const created = runAutomaticBackupIfDue(getDb(), dir, intervalMs);
      if (created) console.log(`[respaldo] Respaldo automático guardado: ${created.name}`);
    } catch (err) {
      console.error("[respaldo] No se pudo hacer el respaldo automático:", err);
    }
  };
  const first = setTimeout(run, 0);
  const timer = setInterval(run, checkEveryMs);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
