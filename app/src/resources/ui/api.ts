import { toApiError } from "./api-error";
import { buildUrl, type QueryParams, readBody, send } from "./api-transport";
import { loginUrl } from "./login-url";

export { apiDownload, type DownloadedFile, saveDownloadedFile } from "./api-download";
export { ApiError, errorMessage, type FieldErrors, isAppUnreachable } from "./api-error";
export type { QueryParams } from "./api-transport";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Lleva al usuario a la página de acceso cuando su sesión ya no vale (respuesta 401). */
function redirectToLogin(): void {
  window.location.replace(loginUrl(window.location.pathname, window.location.search));
}

function buildInit(method: Method, body: unknown): RequestInit {
  const init: RequestInit = { method, headers: { Accept: "application/json" } };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return init;
}

/**
 * Llama a la API JSON (`/api/v1` + `path`); un cuerpo `FormData` se envía como multipart. Devuelve el cuerpo parseado (o `undefined` en 204)
 * y lanza `ApiError` si la respuesta no es 2xx o no hay conexión con el servidor.
 */
export async function apiRequest<T>(method: Method, path: string, body?: unknown, query?: QueryParams): Promise<T> {
  const response = await send(buildUrl(path, query), buildInit(method, body));
  const data = await readBody(response);
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    throw toApiError(response.status, data);
  }
  return data as T;
}

/** Atajos por método HTTP sobre `apiRequest`. */
export const api = {
  get: <T>(path: string, query?: QueryParams) => apiRequest<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => apiRequest<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, body),
  delete: <T = void>(path: string) => apiRequest<T>("DELETE", path),
  upload: <T>(path: string, form: FormData) => apiRequest<T>("POST", path, form),
};
