import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { downloadBackupHandler } from "./backup.controller";
import { backupFileName, backupsDirFor, validateBackupFile } from "./backup.service";
import { addProduct, dataDir, setBusinessName, useBackupEnvironment } from "./backup.test-support";

useBackupEnvironment();

test("los nombres usan la fecha y hora local del negocio", () => {
  const now = new Date("2026-10-29T03:05:00.000Z");
  expect(backupFileName(now)).toBe("minicajero-2026-10-28-2305.db");
  expect(backupFileName(now, "pre-restore")).toBe("minicajero-antes-de-restaurar-2026-10-28-2305.db");
});

test("la descarga es una BD SQLite íntegra con los datos actuales", async () => {
  setBusinessName("Bodega Ñandú");
  addProduct("Café");
  const response = downloadBackupHandler();
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="minicajero-\d{4}-\d{2}-\d{2}-\d{4}\.db"$/,
  );
  const file = join(dataDir(), "descarga.db");
  writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
  expect(() => validateBackupFile(file)).not.toThrow();
  const copy = new Database(file, { readonly: true });
  expect(copy.query("SELECT value FROM settings WHERE key = 'business_name'").get()).toEqual({
    value: "Bodega Ñandú",
  });
  copy.close();
  expect(readdirSync(backupsDirFor(dataDir()))).toEqual([]);
});
