import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { migrations } from "../db/migrations";
import { runMigrations } from "../db/migrator";

/** Base de datos en memoria con todas las migraciones aplicadas. */
export function createTestDatabase(): Database {
  const db = openDatabase(":memory:");
  runMigrations(db, migrations);
  return db;
}
