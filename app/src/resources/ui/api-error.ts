/** Errores de validación por campo devueltos por la API: campo -> mensaje. */
export type FieldErrors = Record<string, string>;

/** Error de una llamada a la API con el estado HTTP y los errores por campo (si los hay). `status` 0 = sin conexión con el servidor. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.details).length > 0;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "La solicitud no es válida",
  404: "No se encontró el recurso solicitado",
  409: "La operación entra en conflicto con los datos actuales",
  500: "Error interno del servidor",
};

/**
 * ¿El error indica que la aplicación ya no está en marcha? Pasa cuando no hay conexión (`status` 0)
 * o cuando el servidor devuelve 502/503/504 porque el proceso se apagó.
 */
export function isAppUnreachable(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) return {};
  const errors: FieldErrors = {};
  for (const [field, message] of Object.entries(value)) {
    if (typeof message === "string") errors[field] = message;
  }
  return errors;
}

export function toApiError(status: number, body: unknown): ApiError {
  const fallback = STATUS_MESSAGES[status] ?? `Error inesperado (${status})`;
  if (!isRecord(body)) return new ApiError(status, fallback);
  const message = typeof body.error === "string" && body.error !== "" ? body.error : fallback;
  return new ApiError(status, message, toFieldErrors(body.details));
}

/** Mensaje legible para cualquier error (de la API o inesperado). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  console.error(err);
  return "Ocurrió un error inesperado";
}
