import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupsDirFor, createDownloadBackup, listBackupFiles, restoreDatabase } from "./backup.service";
import { businessName, dataDir, setBusinessName, useBackupEnvironment } from "./backup.test-support";

useBackupEnvironment();

function expectRejected(bytes: Uint8Array, message: RegExp): void {
  setBusinessName("Intacto");
  expect(() => restoreDatabase(bytes)).toThrow(message);
  expect(businessName()).toBe("Intacto");
}

test("rechaza archivos vacíos y que no son SQLite", () => {
  expectRejected(new Uint8Array(), /vacío/);
  expectRejected(new TextEncoder().encode("esto no es una base de datos"), /no es una base de datos SQLite/);
});

test("rechaza una base SQLite dañada", () => {
  const corrupt = new Uint8Array(4096);
  corrupt.set(new TextEncoder().encode("SQLite format 3\0"));
  expectRejected(corrupt, /respaldo válido/);
});

test("rechaza una base SQLite sin registro de versiones", () => {
  const foreign = join(dataDir(), "otra.db");
  const other = new Database(foreign, { create: true });
  other.run("CREATE TABLE notas (texto TEXT)");
  other.close();
  expectRejected(readFileSync(foreign), /registro de versiones/);
});

test("rechaza un respaldo de una versión más nueva", () => {
  const newer = join(dataDir(), "nueva.db");
  writeFileSync(newer, createDownloadBackup().bytes);
  const newerDb = new Database(newer);
  newerDb.query("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(9999, "futura");
  newerDb.close();
  expectRejected(readFileSync(newer), /versión más nueva/);
});

test("un rechazo no deja respaldos previos", () => {
  expectRejected(new Uint8Array(), /vacío/);
  expect(listBackupFiles(backupsDirFor(dataDir()))).toEqual([]);
});
