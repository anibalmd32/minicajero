import { BadRequestError } from "../../lib/http-errors";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USERNAME_MAX_LENGTH } from "./auth.constants";

const USERNAME_PATTERN = /^\S+$/;

/** Valida el nombre de usuario: una sola palabra, sin espacios. */
export function validateUsername(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "") throw new BadRequestError("El usuario es obligatorio", { username: "Escribe un usuario" });
  if (value.length > USERNAME_MAX_LENGTH) {
    throw new BadRequestError("El usuario es demasiado largo", {
      username: `Debe tener como máximo ${USERNAME_MAX_LENGTH} caracteres`,
    });
  }
  if (!USERNAME_PATTERN.test(value)) {
    throw new BadRequestError("El usuario no es válido", { username: "Debe ser una sola palabra, sin espacios" });
  }
  return value;
}

/** Valida la contraseña: mínimo 4 caracteres. */
export function validatePassword(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestError("La contraseña es demasiado corta", {
      password: `Debe tener al mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
    });
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new BadRequestError("La contraseña es demasiado larga", {
      password: `Debe tener como máximo ${PASSWORD_MAX_LENGTH} caracteres`,
    });
  }
  return value;
}
