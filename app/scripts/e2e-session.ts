export interface E2eSession {
  name: string;
  value: string;
  cookieHeader: string;
}

/** Usuario y contraseña con los que iniciar sesión. */
export interface E2eCredentials {
  username: string;
  password: string;
}

const DEFAULT_CREDENTIALS: E2eCredentials = { username: "demo", password: "demo-cajero-2026" };
const LOGIN_FLAG = "--login=";

/** Lee `--login=usuario:clave` de los argumentos; sin él usa `E2E_USER` y `E2E_PASSWORD` o los de la base de demo. */
export function credentialsFromArgs(args: readonly string[]): E2eCredentials {
  const flag = args.find((arg) => arg.startsWith(LOGIN_FLAG));
  if (flag === undefined) {
    return {
      username: process.env.E2E_USER ?? DEFAULT_CREDENTIALS.username,
      password: process.env.E2E_PASSWORD ?? DEFAULT_CREDENTIALS.password,
    };
  }
  const value = flag.slice(LOGIN_FLAG.length);
  const separator = value.indexOf(":");
  if (separator === -1) return { username: value, password: "" };
  return { username: value.slice(0, separator), password: value.slice(separator + 1) };
}

/** Argumentos posicionales (sin las opciones `--...`). */
export function positionalArgs(args: readonly string[]): string[] {
  return args.filter((arg) => !arg.startsWith("--"));
}

/** Inicia sesión en la app y devuelve la cookie de sesión. */
export async function loginToApp(origin: string, credentials: E2eCredentials): Promise<E2eSession> {
  const response = await fetch(`${origin}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(credentials),
  });
  const cookie = response.headers.get("set-cookie");
  if (!response.ok || !cookie) throw new Error(`No se pudo iniciar sesión: ${response.status}`);
  const pair = cookie.split(";")[0] ?? "";
  const separator = pair.indexOf("=");
  return { name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1).trim(), cookieHeader: pair.trim() };
}
