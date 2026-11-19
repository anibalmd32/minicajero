import { Database } from "bun:sqlite";
import { afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, getDb, initDatabase } from "../../db/connection";
import { migrations } from "../../db/migrations";

let currentDataDir = "";

export function dataDir(): string {
  return currentDataDir;
}

export function useBackupEnvironment(): void {
  beforeEach(() => {
    currentDataDir = mkdtempSync(join(tmpdir(), "lb-respaldo-"));
    initDatabase(currentDataDir);
  });
  afterEach(() => {
    closeDatabase();
    rmSync(currentDataDir, { recursive: true, force: true });
  });
}

export function latestMigrationVersion(): number {
  return migrations.at(-1)?.version ?? 0;
}

export function businessName(): string | undefined {
  return getDb().query<{ value: string }, []>("SELECT value FROM settings WHERE key = 'business_name'").get()?.value;
}

export function setBusinessName(name: string): void {
  getDb().query("UPDATE settings SET value = ? WHERE key = 'business_name'").run(name);
}

export function productCount(): number {
  return getDb().query<{ total: number }, []>("SELECT COUNT(*) AS total FROM products").get()?.total ?? 0;
}

export function addProduct(name: string): void {
  getDb().query("INSERT INTO products (name, price_usd_cents, stock) VALUES (?, ?, ?)").run(name, 150, 3);
}

export function restoreRequest(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:4000/api/v1/backup/restore", { method: "POST", body, headers });
}

export function uploadForm(bytes: Uint8Array<ArrayBuffer>, name = "respaldo.db"): FormData {
  const form = new FormData();
  form.append("file", new File([bytes], name));
  return form;
}

/** Crea una BD que solo conoce la primera migración, con o sin su esquema aplicado. */
export function writeLegacyDatabase(path: string, withFirstSchema: boolean): void {
  const first = migrations[0];
  if (!first) throw new Error("No hay migraciones");
  const db = new Database(path, { create: true, strict: true });
  db.run(
    "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT '')",
  );
  const up = first.up;
  if (withFirstSchema) {
    if (typeof up === "string") db.run(up);
    else up(db);
  }
  db.query("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(first.version, first.name);
  db.close();
}
