import { api } from "./api";

/** Estado de acceso devuelto por `/api/v1/auth/status`. */
export interface AuthStatus {
  needsSetup: boolean;
  authenticated: boolean;
  username: string | null;
}

/** Credenciales para iniciar sesión o crear el usuario. */
export interface Credentials {
  username: string;
  password: string;
}

/** Datos para crear de nuevo el usuario y la contraseña con la clave maestra. */
export interface ResetRequest extends Credentials {
  master_key: string;
}

/** Datos para cambiar la contraseña del usuario que está dentro. */
export interface PasswordChange {
  current_password: string;
  new_password: string;
}

/** Consulta si falta crear el usuario y si hay una sesión iniciada. */
export function fetchAuthStatus(): Promise<AuthStatus> {
  return api.get<AuthStatus>("/auth/status");
}

/** Crea el usuario y la contraseña (solo la primera vez) e inicia sesión. */
export function setupUser(credentials: Credentials): Promise<{ username: string }> {
  return api.post<{ username: string }>("/auth/setup", credentials);
}

/** Inicia sesión con el usuario y la contraseña. */
export function login(credentials: Credentials): Promise<{ username: string }> {
  return api.post<{ username: string }>("/auth/login", credentials);
}

/** Crea de nuevo el usuario y la contraseña con la clave maestra de reinicio. */
export function resetUser(request: ResetRequest): Promise<{ username: string }> {
  return api.post<{ username: string }>("/auth/reset", request);
}

/** Cambia la contraseña del usuario que está dentro. */
export function changePassword(change: PasswordChange): Promise<{ username: string }> {
  return api.post<{ username: string }>("/auth/password", change);
}

/** Cierra la sesión actual. */
export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}
