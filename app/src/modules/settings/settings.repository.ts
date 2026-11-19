import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";

/** Ajustes guardados como pares clave -> valor de texto. */
export type SettingsMap = Record<string, string>;

/** Lee todos los ajustes guardados. */
export function readSettings(db: Database = getDb()): SettingsMap {
  const rows = db.query<{ key: string; value: string }, []>("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/** Guarda (inserta o actualiza) varios ajustes en una sola transacción; solo toca `updated_at` si el valor cambia. */
export function writeSettings(entries: SettingsMap, db: Database = getDb()): void {
  const upsert = db.query<unknown, { key: string; value: string }>(
    `INSERT INTO settings (key, value) VALUES ($key, $value)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE settings.value IS NOT excluded.value`,
  );
  db.transaction(() => {
    for (const [key, value] of Object.entries(entries)) upsert.run({ key, value });
  })();
}
