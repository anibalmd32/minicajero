import { expect, test } from "bun:test";
import { utimesSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../../db/connection";
import {
  BACKUP_RETENTION,
  backupsDirFor,
  createBackup,
  listBackupFiles,
  pruneBackups,
  runAutomaticBackupIfDue,
} from "./backup.service";
import { dataDir, useBackupEnvironment } from "./backup.test-support";

useBackupEnvironment();

const day = 24 * 60 * 60 * 1000;

function createBackupAt(dir: string, at: Date): string {
  const created = createBackup(getDb(), dir, "automatic", at);
  utimesSync(join(dir, created.name), at, at);
  return created.name;
}

test("se hace si no hay ninguno o si el último tiene 24 h", () => {
  const dir = backupsDirFor(dataDir());
  const start = new Date("2026-10-01T12:00:00.000Z");
  const first = runAutomaticBackupIfDue(getDb(), dir, day, start);
  expect(first?.name).toBe("minicajero-2026-10-01-0800.db");
  utimesSync(join(dir, first?.name ?? ""), start, start);
  expect(runAutomaticBackupIfDue(getDb(), dir, day, new Date(start.getTime() + day / 2))).toBeNull();
  expect(runAutomaticBackupIfDue(getDb(), dir, day, new Date(start.getTime() + day))).not.toBeNull();
});

test("conserva los 14 más recientes de cada tipo", () => {
  const dir = backupsDirFor(dataDir());
  const start = new Date("2026-10-01T12:00:00.000Z");
  createBackupAt(dir, start);
  for (let i = 1; i <= BACKUP_RETENTION + 2; i++) createBackupAt(dir, new Date(start.getTime() + i * day));
  createBackup(getDb(), dir, "pre-restore", start);

  const files = listBackupFiles(dir);
  expect(files.filter((f) => f.kind === "automatic")).toHaveLength(BACKUP_RETENTION);
  expect(files.filter((f) => f.kind === "pre-restore")).toHaveLength(1);
  expect(files.some((f) => f.name === "minicajero-2026-10-01-0800.db")).toBe(false);
  expect(pruneBackups(dir, "automatic")).toEqual([]);
});

test("dos respaldos en el mismo minuto no se pisan", () => {
  const dir = backupsDirFor(dataDir());
  const now = new Date("2026-10-29T15:30:00.000Z");
  const first = createBackup(getDb(), dir, "automatic", now);
  const second = createBackup(getDb(), dir, "automatic", now);
  expect(first.name).toBe("minicajero-2026-10-29-1130.db");
  expect(second.name).toBe("minicajero-2026-10-29-1130-2.db");
});
