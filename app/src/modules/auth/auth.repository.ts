import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";

/** Usuario guardado en la BD (solo hay uno). */
export interface StoredUser {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

/** Usuario de la BD, o `null` si todavía no se ha creado ninguno. */
export function findUser(db: Database = getDb()): StoredUser | null {
  const row = db
    .query<StoredUser, []>(
      "SELECT id, username, password_hash, password_salt, created_at, updated_at FROM app_user WHERE id = 1",
    )
    .get();
  return row ?? null;
}

/** Crea o reemplaza el único usuario de la aplicación. */
export function saveUser(
  user: { username: string; password_hash: string; password_salt: string },
  db: Database = getDb(),
): void {
  db.run(
    `INSERT INTO app_user (id, username, password_hash, password_salt)
     VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       username = excluded.username,
       password_hash = excluded.password_hash,
       password_salt = excluded.password_salt,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [user.username, user.password_hash, user.password_salt],
  );
}

/** Inserta una sesión y borra las vencidas. */
export function insertSession(tokenHash: string, expiresAt: string, db: Database = getDb()): void {
  db.transaction(() => {
    db.run("DELETE FROM app_session WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    db.run("INSERT INTO app_session (token_hash, expires_at) VALUES (?, ?)", [tokenHash, expiresAt]);
  })();
}

/** ¿Hay una sesión vigente con ese hash? */
export function sessionExists(tokenHash: string, db: Database = getDb()): boolean {
  const row = db
    .query<{ found: number }, [string]>(
      "SELECT 1 AS found FROM app_session WHERE token_hash = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    )
    .get(tokenHash);
  return row !== null;
}

/** Borra una sesión. */
export function deleteSession(tokenHash: string, db: Database = getDb()): void {
  db.run("DELETE FROM app_session WHERE token_hash = ?", [tokenHash]);
}

/** Borra todas las sesiones. */
export function deleteAllSessions(db: Database = getDb()): void {
  db.run("DELETE FROM app_session");
}
