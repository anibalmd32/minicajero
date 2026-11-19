import { credentialsFromArgs, loginToApp, positionalArgs } from "../e2e-session";
import type { PairingResponse, PhoneStatusResponse } from "./messages";

/** Dónde está la app que se prueba y con qué sesión se le habla. */
export interface E2eEnv {
  appUrl: URL;
  origin: string;
  cookie: string;
  sessionName: string;
  sessionValue: string;
}

export const insecureTls = { rejectUnauthorized: false };

/** Lee la URL de la app de los argumentos y inicia sesión. */
export async function loadEnv(): Promise<E2eEnv> {
  const args = process.argv.slice(2);
  const appUrl = new URL(positionalArgs(args)[0] ?? "http://127.0.0.1:4000");
  const session = await loginToApp(appUrl.origin, credentialsFromArgs(args));
  return {
    appUrl,
    origin: appUrl.origin,
    cookie: session.cookieHeader,
    sessionName: session.name,
    sessionValue: session.value,
  };
}

/** Cabeceras de una petición JSON del mismo origen con la sesión. */
export function jsonHeaders(env: E2eEnv): Record<string, string> {
  return { "Content-Type": "application/json", Origin: env.origin, Cookie: env.cookie };
}

/** `POST /api/v1/phone/pairing` con origen y sesión válidos. */
export function requestPairing(env: E2eEnv): Promise<Response> {
  return fetch(`${env.origin}/api/v1/phone/pairing`, { method: "POST", headers: jsonHeaders(env), body: "{}" });
}

/** Pide un emparejamiento y devuelve su respuesta ya leída. */
export async function createPairing(env: E2eEnv): Promise<PairingResponse> {
  return (await requestPairing(env)).json() as Promise<PairingResponse>;
}

/** Token de emparejamiento que lleva el fragmento de la URL del QR. */
export function tokenOf(url: URL): string {
  return new URLSearchParams(url.hash.slice(1)).get("t") ?? "";
}

/** `GET /api/v1/phone/status`. */
export async function fetchPhoneStatus(env: E2eEnv): Promise<PhoneStatusResponse> {
  const response = await fetch(`${env.origin}/api/v1/phone/status`, {
    headers: { Origin: env.origin, Cookie: env.cookie },
  });
  return response.json() as Promise<PhoneStatusResponse>;
}
