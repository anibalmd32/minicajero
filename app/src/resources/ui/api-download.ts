import { toApiError } from "./api-error";
import { buildUrl, readBody, send } from "./api-transport";

/** Archivo descargado de la API. */
export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

const FILE_NAME_PATTERN = /filename="([^"]+)"/;

/** Descarga un archivo de la API (`/api/v1` + `path`). Lanza `ApiError` si la respuesta no es 2xx. */
export async function apiDownload(path: string, fallbackName: string): Promise<DownloadedFile> {
  const response = await send(buildUrl(path), { method: "GET" });
  if (!response.ok) throw toApiError(response.status, await readBody(response));
  const fileName = FILE_NAME_PATTERN.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  return { blob: await response.blob(), fileName };
}

/** Hace que el navegador guarde el archivo con su nombre. */
export function saveDownloadedFile({ blob, fileName }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
