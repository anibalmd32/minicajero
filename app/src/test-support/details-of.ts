import { expect } from "bun:test";
import { BadRequestError } from "../lib/http-errors";

/** Ejecuta una acción que debe fallar con 400 y devuelve el detalle por campo. */
export function detailsOf(action: () => unknown): Record<string, string> | undefined {
  try {
    action();
  } catch (err) {
    expect(err).toBeInstanceOf(BadRequestError);
    return (err as BadRequestError).details;
  }
  throw new Error("Se esperaba un error de validación");
}
