export type ApiClient = {
  send(method: string, path: string, body?: unknown): Promise<unknown>;
};

async function failOnError(response: Response, method: string, path: string): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

function sessionCookieOf(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("La app no devolvió la cookie de sesión");
  return cookie;
}

async function openSession(origin: string, credentials: { username: string; password: string }): Promise<string> {
  const status = (await (await fetch(`${origin}/api/v1/auth/status`)).json()) as { needsSetup?: boolean };
  const path = status.needsSetup ? "/api/v1/auth/setup" : "/api/v1/auth/login";
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(credentials),
  });
  await failOnError(response.clone(), "POST", path);
  return sessionCookieOf(response);
}

/** Abre sesión en la app (o crea el usuario si es la primera vez) y devuelve un cliente de la API. */
export async function connectApi(
  origin: string,
  credentials: { username: string; password: string },
): Promise<ApiClient> {
  const cookie = await openSession(origin, credentials);
  return {
    async send(method, path, body) {
      const response = await fetch(`${origin}/api/v1${path}`, {
        method,
        headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return failOnError(response, method, path);
    },
  };
}
