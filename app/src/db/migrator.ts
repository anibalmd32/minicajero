import type { Database } from "bun:sqlite";

/**
 * Migración versionada. `version` es un entero creciente y único; `up` es SQL o una función (para transformaciones
 * que necesitan JS, como rellenar columnas calculadas). Se ejecuta en una transacción.
 */
export interface Migration {
  version: number;
  name: string;
  up: string | ((db: Database) => void);
}

/** Resultado de aplicar migraciones. */
export interface MigrationResult {
  applied: number[];
  currentVersion: number;
}

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    applied_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ) STRICT
`;

/** Comprueba que las versiones sean enteros positivos estrictamente crecientes. */
export function assertMigrationsOrdered(migrations: readonly Migration[]): void {
  let previous = 0;
  for (const migration of migrations) {
    if (!Number.isSafeInteger(migration.version) || migration.version <= previous) {
      throw new Error(
        `Migraciones mal ordenadas: la versión ${migration.version} (${migration.name}) debe ser un entero mayor que ${previous}`,
      );
    }
    previous = migration.version;
  }
}

/** Versión más alta registrada en `schema_migrations` (0 si ninguna). */
export function currentSchemaVersion(db: Database): number {
  const row = db.query<{ version: number | null }, []>("SELECT MAX(version) AS version FROM schema_migrations").get();
  return row?.version ?? 0;
}

/**
 * Aplica, en orden y cada una en su propia transacción, las migraciones aún no registradas.
 * Cada una se vuelve a comprobar con el bloqueo de escritura tomado: si dos procesos arrancan a la vez, solo uno la aplica.
 * Falla si la BD tiene una versión que esta app no conoce (BD creada por una versión más nueva).
 */
export function runMigrations(db: Database, migrations: readonly Migration[]): MigrationResult {
  assertMigrationsOrdered(migrations);
  db.run(CREATE_MIGRATIONS_TABLE);
  const appliedVersions = readAppliedVersions(db);
  assertAllVersionsKnown(appliedVersions, migrations);

  const done = new Set(appliedVersions);
  const applied: number[] = [];
  for (const migration of migrations) {
    if (!done.has(migration.version) && applyMigration(db, migration)) applied.push(migration.version);
  }
  return { applied, currentVersion: currentSchemaVersion(db) };
}

function readAppliedVersions(db: Database): number[] {
  return db
    .query<{ version: number }, []>("SELECT version FROM schema_migrations ORDER BY version")
    .all()
    .map((row) => row.version);
}

function assertAllVersionsKnown(appliedVersions: number[], migrations: readonly Migration[]): void {
  const known = new Set(migrations.map((m) => m.version));
  const unknown = appliedVersions.filter((version) => !known.has(version));
  if (unknown.length > 0) {
    throw new Error(
      `La base de datos tiene migraciones desconocidas (${unknown.join(", ")}). ¿Fue creada por una versión más nueva de la aplicación?`,
    );
  }
}

function applyMigration(db: Database, migration: Migration): boolean {
  const isRecorded = db.query<{ found: number }, [number]>(
    "SELECT 1 AS found FROM schema_migrations WHERE version = ?",
  );
  const record = db.query("INSERT INTO schema_migrations (version, name) VALUES (?, ?)");
  const apply = db.transaction((): boolean => {
    if (isRecorded.get(migration.version)) return false;
    if (typeof migration.up === "string") db.run(migration.up);
    else migration.up(db);
    record.run(migration.version, migration.name);
    return true;
  });
  try {
    return apply.immediate();
  } catch (err) {
    throw new Error(`Falló la migración ${migration.version} (${migration.name}): ${(err as Error).message}`, {
      cause: err,
    });
  }
}
