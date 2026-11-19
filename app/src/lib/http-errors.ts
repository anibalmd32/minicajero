/** Detalle de errores de validación: campo -> mensaje. */
export type ErrorDetails = Record<string, string>;

/** Error HTTP tipado. Los handlers lo lanzan y `handle()` lo convierte en respuesta JSON. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Solicitud inválida", details?: ErrorDetails) {
    super(400, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado", details?: ErrorDetails) {
    super(404, message, details);
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = "Método no permitido") {
    super(405, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflicto con el estado actual del recurso", details?: ErrorDetails) {
    super(409, message, details);
  }
}
