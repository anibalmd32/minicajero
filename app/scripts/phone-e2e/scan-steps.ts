import { PHONE_PROTOCOL_VERSION } from "../../src/modules/phone/phone.protocol";
import { check } from "../e2e-support/check";
import { type E2eEnv, insecureTls } from "../e2e-support/env";
import type { WireMessage } from "../e2e-support/messages";
import type { Pairing } from "./pairing-steps";
import { connect, type Peer } from "./peer";

/** PC y teléfono simulados, ya emparejados. */
export interface ConnectedPeers {
  pc: Peer;
  phone: Peer;
  ready: WireMessage;
}

const ADDED_TEXT = "Harina PAN agregada · 2 en el carrito";

async function connectPeers(env: E2eEnv, pairing: Pairing): Promise<ConnectedPeers> {
  const pc = await connect(`ws://${env.appUrl.host}/api/v1/phone/events`, {
    headers: { Origin: env.origin, Cookie: env.cookie },
  });
  check((await pc.next("phones")).phones.length === 0, "PC conectada: sin teléfonos");
  const phone = await connect(`wss://${pairing.preferred.host}/movil/ws`, {
    tls: insecureTls,
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile" },
  });
  phone.send({ type: "hello", version: PHONE_PROTOCOL_VERSION, token: pairing.token });
  const ready = await phone.next("ready");
  check(
    ready.context === "ninguno" && typeof ready.session === "string",
    "teléfono emparejado (contexto ninguno)",
    ready,
  );
  check(ready.phone.name === "Android · Chrome", "nombre del teléfono", ready.phone.name);
  check((await pc.next("phones")).phones.length === 1, "la PC ve el teléfono");
  return { pc, phone, ready };
}

async function checkForwardedScan({ pc, phone, ready }: ConnectedPeers): Promise<void> {
  phone.send({ type: "scan", id: "a2", code: "  7591234567890 ", format: "ean_13" });
  const forwarded = await pc.next("scan");
  check(
    forwarded.code === "7591234567890" && forwarded.format === "ean_13" && forwarded.phone.id === ready.phone.id,
    "la PC recibe el código limpio",
    forwarded,
  );
  pc.send({ type: "scan-result", id: forwarded.id, status: "added", message: ADDED_TEXT });
  const added = await phone.next("scan-result");
  check(
    added.id === "a2" && added.status === "added" && added.message === ADDED_TEXT,
    "ida y vuelta del escaneo",
    added,
  );
}

async function checkScanFailures({ pc, phone }: ConnectedPeers): Promise<void> {
  phone.send({ type: "scan", id: "a3", code: "abc\u0007", format: "code_128" });
  check((await phone.next("scan-result")).status === "error", "código con caracteres no válidos → error");
  phone.send({ type: "scan", id: "a4", code: "123", format: "ean_8" });
  await pc.next("scan");
  const timeout = await phone.next("scan-result", 8000);
  check(timeout.id === "a4" && timeout.status === "error", "sin respuesta de la PC → error por tiempo", timeout);
}

/** Conecta la PC y el teléfono y recorre el flujo de escaneo: sin pantalla, ida y vuelta, código inválido y tiempo agotado. */
export async function runScanFlow(env: E2eEnv, pairing: Pairing): Promise<ConnectedPeers> {
  const peers = await connectPeers(env, pairing);
  const { pc, phone } = peers;
  phone.send({ type: "scan", id: "a1", code: "7591234567890", format: "ean_13" });
  const noTarget = await phone.next("scan-result");
  check(
    noTarget.status === "no-target" && noTarget.message === "Abre Ventas o Inventario en la computadora",
    "sin pantalla → no-target",
    noTarget,
  );
  pc.send({ type: "focus", page: "ventas", visible: true });
  check((await phone.next("context")).context === "ventas", "el teléfono sabe que va a Ventas");
  await checkForwardedScan(peers);
  await checkScanFailures(peers);
  return peers;
}
