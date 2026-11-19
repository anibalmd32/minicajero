/** Ruta de la página de acceso. */
export const LOGIN_PATH = "/login";

/** Clave con el destino al que se quería ir, para volver allí después de entrar. */
const NEXT_PARAM = "next";

function normalize(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Destino al que ir después de entrar: el que se pidió antes, si era una página de la aplicación. */
export function loginDestination(search: string): string {
  const next = new URLSearchParams(search).get(NEXT_PARAM);
  if (next === null || !next.startsWith("/") || next.startsWith("//") || normalize(next) === LOGIN_PATH) return "/";
  return next;
}

/** Enlace a la página de acceso conservando la página a la que se quería ir. */
export function loginUrl(pathname: string, search: string): string {
  if (normalize(pathname) === LOGIN_PATH) return LOGIN_PATH;
  const url = new URL(LOGIN_PATH, window.location.origin);
  url.searchParams.set(NEXT_PARAM, `${pathname}${search}`);
  return `${url.pathname}${url.search}`;
}
