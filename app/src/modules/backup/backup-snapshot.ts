import type { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { sqliteSidecarFiles } from "../../db/connection";

export function removeWithSidecars(path: string): void {
  for (const file of [path, ...sqliteSidecarFiles(path)]) rmSync(file, { force: true });
}

/** Escribe en `targetPath` una copia consistente y compacta de la BD (`VACUUM INTO`), sin dejar archivos a medias. */
export function writeDatabaseSnapshot(db: Database, targetPath: string): void {
  const partial = `${targetPath}.parcial`;
  rmSync(partial, { force: true });
  try {
    db.query("VACUUM INTO ?").run(partial);
    renameSync(partial, targetPath);
  } catch (err) {
    rmSync(partial, { force: true });
    throw err;
  }
}

/** Copia consistente de la BD en memoria, para descargarla. Usa un archivo temporal en `workDir`. */
export function databaseSnapshotBytes(db: Database, workDir: string): Uint8Array<ArrayBuffer> {
  mkdirSync(workDir, { recursive: true });
  const temp = join(workDir, `.descarga-${crypto.randomUUID()}.db`);
  try {
    writeDatabaseSnapshot(db, temp);
    return new Uint8Array(readFileSync(temp));
  } finally {
    removeWithSidecars(temp);
  }
}
