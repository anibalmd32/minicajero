import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDatabasePath, getDb } from "../../db/connection";
import { migrations } from "../../db/migrations";
import { backupsDirFor, createDownloadBackup, listBackupFiles, restoreDatabase } from "./backup.service";
import {
  addProduct,
  businessName,
  dataDir,
  latestMigrationVersion,
  productCount,
  setBusinessName,
  useBackupEnvironment,
  writeLegacyDatabase,
} from "./backup.test-support";

useBackupEnvironment();

function hiddenFilesIn(dir: string): string[] {
  return readdirSync(dir).filter((name) => name.startsWith("."));
}

test("restaurar devuelve los datos del respaldo y guarda antes un respaldo de los actuales", () => {
  setBusinessName("Antes");
  addProduct("Harina");
  const { bytes } = createDownloadBackup();

  setBusinessName("Después");
  addProduct("Arroz");
  expect(productCount()).toBe(2);

  const result = restoreDatabase(bytes, new Date("2026-10-29T15:30:00.000Z"));
  expect(result.status).toBe("restored");
  expect(result.schema_version).toBe(latestMigrationVersion());
  expect(result.pre_restore_backup.name).toBe("minicajero-antes-de-restaurar-2026-10-29-1130.db");
  expect(businessName()).toBe("Antes");
  expect(productCount()).toBe(1);
  expect(getDb().query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });

  const dir = backupsDirFor(dataDir());
  const previous = new Database(join(dir, result.pre_restore_backup.name), { readonly: true });
  expect(previous.query("SELECT COUNT(*) AS total FROM products").get()).toEqual({ total: 2 });
  previous.close();
  expect(hiddenFilesIn(dir)).toEqual([]);
  expect(existsSync(`${getDatabasePath()}.anterior`)).toBe(false);
});

test("restaurar un respaldo antiguo aplica las migraciones pendientes", () => {
  const old = join(dataDir(), "antiguo.db");
  writeLegacyDatabase(old, true);
  const result = restoreDatabase(readFileSync(old));
  expect(result.applied_migrations).toEqual(migrations.slice(1).map((m) => m.version));
  expect(result.schema_version).toBe(latestMigrationVersion());
});

test("si las migraciones del respaldo fallan no guarda respaldo previo ni toca los datos", () => {
  setBusinessName("Intacto");
  const broken = join(dataDir(), "roto.db");
  writeLegacyDatabase(broken, false);

  expect(() => restoreDatabase(readFileSync(broken))).toThrow(/se mantienen los datos actuales/);
  expect(businessName()).toBe("Intacto");
  const dir = backupsDirFor(dataDir());
  expect(listBackupFiles(dir)).toEqual([]);
  expect(hiddenFilesIn(dir)).toEqual([]);
});
