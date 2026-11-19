import { expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LocalAddress } from "./network";
import {
  type PcScanMessage,
  PHONE_PROTOCOL_VERSION,
  type ReadyMessage,
  type ScanResultMessage,
  type ServerToPcMessage,
  type ServerToPhoneMessage,
} from "./phone.protocol";
import type { PairingInfo } from "./phone.service";
import { PhoneScanner } from "./phone.service";

export const insecureTls = { rejectUnauthorized: false };
export const LOOPBACK: LocalAddress = { ip: "127.0.0.1", interfaceName: "Wi-Fi", label: "Wi-Fi" };
export const WIFI: LocalAddress = { ip: "192.168.77.5", interfaceName: "Wi-Fi", label: "Wi-Fi" };

let dataDir = "";
let scanner: PhoneScanner | null = null;

export function cleanupScanner(): void {
  scanner?.shutdown();
  scanner = null;
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  dataDir = "";
}

export function currentDataDir(): string {
  return dataDir;
}

export function createScanner(addresses: () => LocalAddress[] = () => [LOOPBACK], clock?: () => number): PhoneScanner {
  dataDir = mkdtempSync(join(tmpdir(), "minicajero-movil-"));
  scanner = new PhoneScanner({
    dataDir,
    appPort: 47000 + Math.floor(Math.random() * 2000),
    addresses,
    clock,
    idleShutdownMs: 1000,
    log: () => undefined,
  });
  return scanner;
}

export function readCertificate(): string {
  return readFileSync(join(dataDir, "movil", "certificado.pem"), "utf8");
}

export function pairingUrl(pairing: PairingInfo): URL {
  const first = pairing.urls[0];
  if (!first) throw new Error("El emparejamiento no trae URL");
  return new URL(first.url);
}

export function tokenOf(url: URL): string {
  return url.hash.slice(3);
}

export interface PhoneClient {
  socket: WebSocket;
  messages: ServerToPhoneMessage[];
  closed: Promise<number>;
}

export function openPhone(url: string): Promise<PhoneClient> {
  const socket = new WebSocket(url, { tls: insecureTls } as never);
  const messages: ServerToPhoneMessage[] = [];
  socket.addEventListener("message", (event) => messages.push(JSON.parse(String(event.data))));
  const closed = new Promise<number>((resolve) => socket.addEventListener("close", (event) => resolve(event.code)));
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve({ socket, messages, closed }));
    socket.addEventListener("error", reject);
  });
}

export async function waitFor<T>(read: () => T | undefined, timeoutMs = 2000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error("Tiempo de espera agotado");
    await Bun.sleep(10);
  }
}

export function waitForReady(phone: PhoneClient): Promise<ReadyMessage> {
  return waitFor(() => phone.messages.find((message): message is ReadyMessage => message.type === "ready"));
}

export function waitForScanResult(phone: PhoneClient): Promise<ScanResultMessage> {
  return waitFor(() => phone.messages.find((message): message is ScanResultMessage => message.type === "scan-result"));
}

export async function connectPhone(
  url: URL,
  token: string = tokenOf(url),
): Promise<{ phone: PhoneClient; ready: ReadyMessage }> {
  const phone = await openPhone(`wss://${url.host}/movil/ws`);
  phone.socket.send(JSON.stringify({ type: "hello", version: PHONE_PROTOCOL_VERSION, token }));
  return { phone, ready: await waitForReady(phone) };
}

export class FakePcTab {
  readonly sent: ServerToPcMessage[] = [];

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {}

  waitForScan(): Promise<PcScanMessage> {
    return waitFor(() => this.sent.find((message): message is PcScanMessage => message.type === "scan"));
  }
}

export async function expectOnlyMobilePageExposed(base: string): Promise<void> {
  const page = await fetch(`${base}/movil`, { tls: insecureTls });
  expect(page.status).toBe(200);
  expect(page.headers.get("content-type")).toContain("text/html");
  for (const path of ["/", "/ventas", "/api/v1/health", "/api/v1/phone/status", "/movil/x"]) {
    expect((await fetch(`${base}${path}`, { tls: insecureTls })).status).toBe(404);
  }
}
