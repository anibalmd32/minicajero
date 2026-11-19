import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, getDb, initDatabase } from "./connection";
import { migrations } from "./migrations";

let dir = "";

afterEach(() => {
  closeDatabase();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test("crea la carpeta, activa PRAGMAs y no reaplica migraciones al reabrir", () => {
  dir = join(mkdtempSync(join(tmpdir(), "lb-db-")), "anidada");
  const first = initDatabase(dir);
  expect(first.migrations.applied.length).toBe(migrations.length);
  expect(getDb().query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  expect(getDb().query("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
  closeDatabase();
  const second = initDatabase(dir);
  expect(second.path).toBe(first.path);
  expect(second.migrations.applied).toEqual([]);
});
