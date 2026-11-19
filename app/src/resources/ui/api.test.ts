import { describe, expect, test } from "bun:test";
import { ApiError, isAppUnreachable } from "./api";

describe("isAppUnreachable", () => {
  test("detecta que la aplicación no está en marcha", () => {
    expect(isAppUnreachable(new ApiError(0, "sin conexión"))).toBe(true);
    expect(isAppUnreachable(new ApiError(502, "Error inesperado (502)"))).toBe(true);
    expect(isAppUnreachable(new ApiError(503, "Error inesperado (503)"))).toBe(true);
    expect(isAppUnreachable(new ApiError(504, "Error inesperado (504)"))).toBe(true);
  });

  test("no confunde otros errores con la app apagada", () => {
    expect(isAppUnreachable(new ApiError(400, "inválido"))).toBe(false);
    expect(isAppUnreachable(new ApiError(401, "sin sesión"))).toBe(false);
    expect(isAppUnreachable(new ApiError(404, "no encontrado"))).toBe(false);
    expect(isAppUnreachable(new ApiError(500, "error interno"))).toBe(false);
    expect(isAppUnreachable(new Error("otro"))).toBe(false);
    expect(isAppUnreachable("texto")).toBe(false);
  });
});
