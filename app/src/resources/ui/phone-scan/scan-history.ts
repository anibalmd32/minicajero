import type { ScanContext, ScanStatus } from "../../../modules/phone/phone.protocol";

/** Texto que indica a qué pantalla de la computadora van los códigos. */
export const CONTEXT_TEXTS: Record<ScanContext, string> = {
  ventas: "Enviando a Ventas",
  inventario: "Enviando a Inventario",
  ninguno: "Abre Ventas o Inventario en la computadora",
};

/** Tono visual de un resultado. */
export type ScanTone = "pending" | "success" | "warning" | "danger";

/** Tono de la respuesta de la computadora a un escaneo. */
export function scanTone(status: ScanStatus): ScanTone {
  if (status === "added" || status === "filled" || status === "created" || status === "found") return "success";
  if (status === "error") return "danger";
  return "warning";
}

/** Escaneo en la lista de recientes. */
export interface ScanEntry {
  id: string;
  code: string;
  tone: ScanTone;
  message: string;
  at: number;
}

/** Cuántos escaneos recientes se muestran. */
export const MAX_RECENT_SCANS = 15;

/** Añade un escaneo al principio de la lista y descarta los más antiguos. */
export function pushScan(entries: readonly ScanEntry[], entry: ScanEntry, max = MAX_RECENT_SCANS): ScanEntry[] {
  return [entry, ...entries].slice(0, max);
}

/** Actualiza el resultado de un escaneo de la lista. Devuelve `null` si ya no está. */
export function resolveScan(
  entries: readonly ScanEntry[],
  id: string,
  tone: ScanTone,
  message: string,
): ScanEntry[] | null {
  if (!entries.some((entry) => entry.id === id)) return null;
  return entries.map((entry) => (entry.id === id ? { ...entry, tone, message } : entry));
}

/** Texto para los escaneos que quedaron sin respuesta al perderse la conexión (pueden haber llegado o no). */
export const LOST_SCAN_TEXT = "Se cortó la conexión. Revisa en la computadora si llegó.";

/** Marca con un aviso los escaneos que seguían esperando respuesta: no se sabe si la computadora los recibió. */
export function markPendingScansLost(entries: readonly ScanEntry[]): ScanEntry[] {
  return entries.map((entry) =>
    entry.tone === "pending" ? { ...entry, tone: "warning", message: LOST_SCAN_TEXT } : entry,
  );
}
