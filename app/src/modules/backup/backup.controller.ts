import type { BunRequest } from "bun";
import { json } from "../../lib/http";
import { BadRequestError } from "../../lib/http-errors";
import { mimeEssence, requireSameLocalOrigin } from "../../lib/same-origin";
import {
  BACKUP_CONTENT_TYPE,
  createDownloadBackup,
  currentBackupsDir,
  getBackupList,
  MAX_RESTORE_BYTES,
  resolveBackupFile,
  restoreDatabase,
} from "./backup.service";

type BackupFileRequest = BunRequest<"/api/v1/backup/files/:name">;

const RESTORE_FIELD = "file";

function attachmentHeaders(fileName: string): HeadersInit {
  return {
    "Content-Type": BACKUP_CONTENT_TYPE,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}

/** GET /api/v1/backup — descarga una copia consistente de la BD (`minicajero-AAAA-MM-DD-HHmm.db`). */
export function downloadBackupHandler(): Response {
  const { fileName, bytes } = createDownloadBackup();
  return new Response(bytes, { headers: attachmentHeaders(fileName) });
}

/** GET /api/v1/backup/files — respaldos automáticos y previos a restaurar guardados en `<datos>/backups`. */
export function listBackupsHandler(): Response {
  return json(getBackupList());
}

/** GET /api/v1/backup/files/:name — descarga un respaldo guardado. */
export function downloadBackupFileHandler(req: BackupFileRequest): Response {
  const name = req.params.name;
  const path = resolveBackupFile(currentBackupsDir(), name);
  return new Response(Bun.file(path), { headers: attachmentHeaders(name) });
}

async function readRestoreUpload(req: Request): Promise<Uint8Array> {
  if (mimeEssence(req.headers.get("content-type")) !== "multipart/form-data") {
    throw new BadRequestError("Envía el respaldo como multipart/form-data en el campo «file»");
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_RESTORE_BYTES) {
    throw new BadRequestError("El archivo es demasiado grande para ser un respaldo");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new BadRequestError("No se pudo leer el archivo enviado");
  }
  const file = form.get(RESTORE_FIELD);
  if (!(file instanceof Blob)) {
    throw new BadRequestError("Falta el archivo de respaldo", { [RESTORE_FIELD]: "Selecciona un archivo .db" });
  }
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * POST /api/v1/backup/restore — reemplaza todos los datos por los del respaldo enviado (multipart, campo `file`).
 * Antes guarda un respaldo de la BD actual. Si llega `Origin`, debe ser la propia aplicación.
 */
export async function restoreBackupHandler(req: Request): Promise<Response> {
  requireSameLocalOrigin(req, "Solo la propia aplicación puede restaurar un respaldo");
  const bytes = await readRestoreUpload(req);
  return json(restoreDatabase(bytes));
}
