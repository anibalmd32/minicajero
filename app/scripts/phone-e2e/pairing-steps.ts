import { check } from "../e2e-support/check";
import { type E2eEnv, jsonHeaders, requestPairing, tokenOf } from "../e2e-support/env";
import type { PairingResponse } from "../e2e-support/messages";

/** Emparejamiento obtenido de la API: dirección preferida, token del QR y base HTTPS del servidor del teléfono. */
export interface Pairing {
  preferred: URL;
  token: string;
  lanBase: string;
}

async function checkRejectedRequests(env: E2eEnv): Promise<void> {
  const forbidden = await fetch(`${env.origin}/api/v1/phone/pairing`, {
    method: "POST",
    headers: { ...jsonHeaders(env), Origin: "http://evil.example" },
    body: "{}",
  });
  check(forbidden.status === 403, "POST /pairing desde otro origen → 403", forbidden.status);
  const rebinding = await fetch(`${env.origin}/api/v1/phone/status`, {
    headers: { Host: `evil.example:${env.appUrl.port}`, Cookie: env.cookie },
  });
  check(rebinding.status === 403, "GET /status con Host ajeno → 403", rebinding.status);
}

/** Comprueba los rechazos de origen y Host ajenos y crea el emparejamiento. */
export async function createCheckedPairing(env: E2eEnv): Promise<Pairing> {
  await checkRejectedRequests(env);
  return readPairing(await requestPairing(env));
}

async function readPairing(created: Response): Promise<Pairing> {
  const body = (await created.json()) as PairingResponse;
  check(created.status === 201, "POST /pairing → 201", body);
  check(
    Array.isArray(body.urls) && body.urls.length > 0 && body.qr_svg.startsWith("<svg"),
    "URLs y QR",
    body.urls?.length,
  );
  const preferred = new URL(body.urls[0]?.url ?? "");
  const token = tokenOf(preferred);
  const lanBase = `https://${preferred.host}`;
  console.log(
    `     servidor del teléfono: ${lanBase} (${body.urls.map((url) => `${url.label} ${url.ip}`).join(", ")})`,
  );
  check(token.length === 43, "token de 43 caracteres en el fragmento");
  return { preferred, token, lanBase };
}
