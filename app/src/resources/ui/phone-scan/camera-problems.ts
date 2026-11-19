/** Motivo por el que no se puede usar la cámara. */
export type CameraProblem = "insecure" | "unsupported" | "denied" | "missing" | "busy" | "failed";

/** Mensajes para cada problema con la cámara. */
export const CAMERA_PROBLEM_TEXTS: Record<CameraProblem, string> = {
  insecure: "La cámara no está disponible así. Abre esta página escaneando el código de la computadora.",
  unsupported: "Este navegador no puede leer códigos. Usa Chrome en Android.",
  denied:
    "Falta el permiso de la cámara: toca el ícono a la izquierda de la dirección, entra en Permisos y activa la cámara.",
  missing: "No encontramos una cámara en este teléfono.",
  busy: "Otra app está usando la cámara. Ciérrala y toca Reintentar.",
  failed: "No se pudo abrir la cámara. Toca Reintentar.",
};

/** ¿Se puede reintentar abrir la cámara tras este problema? */
export function canRetryCamera(problem: CameraProblem): boolean {
  return problem === "denied" || problem === "busy" || problem === "failed";
}

/** Traduce el error de `getUserMedia` a un problema conocido. */
export function cameraProblemFromError(error: unknown): CameraProblem {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "failed";
}
