import { fetchAuthStatus } from "./auth";
import { LOGIN_PATH, loginUrl } from "./login-url";

/**
 * Comprueba si hay una sesión iniciada: si no la hay, lleva a la página de acceso y nunca
 * resuelve, para que la página no siga cargando datos sin permiso.
 */
export function requireAccess(): Promise<boolean> {
  return fetchAuthStatus()
    .then((status) => {
      if (status.authenticated) return true;
      window.location.replace(loginUrl(window.location.pathname, window.location.search));
      return new Promise<boolean>(() => {});
    })
    .catch(() => {
      window.location.replace(LOGIN_PATH);
      return new Promise<boolean>(() => {});
    });
}
