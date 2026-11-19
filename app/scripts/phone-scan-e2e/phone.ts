import { PHONE_PROTOCOL_VERSION } from "../../src/modules/phone/phone.protocol";
import { sleep } from "../chrome";
import { createPairing, type E2eEnv, insecureTls, tokenOf } from "../e2e-support/env";
import type { WireMessage } from "../e2e-support/messages";

/** Teléfono simulado conectado al servidor seguro. */
export interface Phone {
  next(type: string, timeoutMs?: number): Promise<WireMessage>;
  send(message: object): void;
  closed: Promise<number>;
}

function openPhoneSocket(host: string): Promise<{ socket: WebSocket; queue: WireMessage[]; closed: Promise<number> }> {
  const socket = new WebSocket(`wss://${host}/movil/ws`, {
    tls: insecureTls,
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-A146M) Chrome/130.0 Mobile" },
  } as never);
  const queue: WireMessage[] = [];
  socket.addEventListener("message", (event) => queue.push(JSON.parse(String(event.data))));
  const closed = new Promise<number>((resolve) => socket.addEventListener("close", (event) => resolve(event.code)));
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve({ socket, queue, closed }));
    socket.addEventListener("error", reject);
  });
}

async function nextMessage(queue: WireMessage[], type: string, timeoutMs: number): Promise<WireMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const index = queue.findIndex((message) => message.type === type);
    const found = index >= 0 ? queue.splice(index, 1)[0] : undefined;
    if (found) return found;
    await sleep(50);
  }
  throw new Error(`No llegó ${type}`);
}

/** Pide un QR, conecta un teléfono simulado con su token y le manda el `hello`. */
export async function pairPhone(env: E2eEnv): Promise<Phone> {
  const pairing = await createPairing(env);
  const url = new URL(pairing.urls[0]?.url ?? "");
  const { socket, queue, closed } = await openPhoneSocket(url.host);
  const phone: Phone = {
    send: (message) => socket.send(JSON.stringify(message)),
    closed,
    next: (type, timeoutMs = 6000) => nextMessage(queue, type, timeoutMs),
  };
  phone.send({ type: "hello", version: PHONE_PROTOCOL_VERSION, token: tokenOf(url) });
  return phone;
}

let scanCounter = 0;

/** Manda un código por el teléfono y espera su resultado. */
export async function scan(phone: Phone, code: string): Promise<WireMessage> {
  const id = `e${++scanCounter}`;
  phone.send({ type: "scan", id, code, format: "ean_13" });
  for (;;) {
    const result = await phone.next("scan-result");
    if (result.id === id) return result;
  }
}
