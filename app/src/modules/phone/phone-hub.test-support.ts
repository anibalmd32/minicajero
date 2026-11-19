import { PairingRegistry } from "./pairing";
import {
  PHONE_PROTOCOL_VERSION,
  type ScanStatus,
  type ServerToPcMessage,
  type ServerToPhoneMessage,
} from "./phone.protocol";
import { type PcTab, type PeerSocket, type PhoneConnection, PhoneHub } from "./phone-hub";

export const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-A146M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

export const DEFAULT_IP = "192.168.1.20";
export const ATTACKER_IP = "192.168.1.66";

type SentMessage = ServerToPhoneMessage | ServerToPcMessage;
type SentOf<T extends SentMessage["type"]> = Extract<SentMessage, { type: T }>;

export class FakeSocket implements PeerSocket {
  readonly sent: SentMessage[] = [];
  closed: { code?: number; reason?: string } | null = null;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as SentMessage);
  }

  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
  }

  all<T extends SentMessage["type"]>(type: T): SentOf<T>[] {
    return this.sent.filter((message): message is SentOf<T> => message.type === type);
  }

  last<T extends SentMessage["type"]>(type: T): SentOf<T> {
    const message = this.all(type).at(-1);
    if (!message) throw new Error(`No llegó el mensaje ${type}`);
    return message;
  }
}

export interface HubOptions {
  scanTimeoutMs?: number;
  helloTimeoutMs?: number;
}

export function helloJson(token: string, version: number = PHONE_PROTOCOL_VERSION): string {
  return JSON.stringify({ type: "hello", version, token });
}

export function focusJson(page: string, visible: boolean): string {
  return JSON.stringify({ type: "focus", page, visible });
}

export function scanResultJson(id: string, status: ScanStatus, message: string): string {
  return JSON.stringify({ type: "scan-result", id, status, message });
}

export function phoneIdOf(phone: PhoneConnection): string {
  if (!phone.info) throw new Error("El teléfono no está identificado");
  return phone.info.id;
}

export function sessionIdOf(phone: PhoneConnection): string {
  if (!phone.session) throw new Error("El teléfono no tiene sesión");
  return phone.session.id;
}

export function setup(options: HubOptions = {}) {
  const registry = new PairingRegistry();
  const logs: string[] = [];
  const hub = new PhoneHub({ registry, log: (message) => logs.push(message), ...options });
  const pairPhone = (ip = DEFAULT_IP): { socket: FakeSocket; phone: PhoneConnection } => {
    const socket = new FakeSocket();
    const phone = hub.phoneOpened(socket, ip, ANDROID_CHROME);
    hub.phoneMessage(phone, helloJson(registry.createPairing().token));
    return { socket, phone };
  };
  const openTab = (page?: string, visible = true): { socket: FakeSocket; tab: PcTab } => {
    const socket = new FakeSocket();
    const tab = hub.pcOpened(socket);
    if (page) hub.pcMessage(tab, focusJson(page, visible));
    return { socket, tab };
  };
  const scan = (phone: PhoneConnection, id: string, code: string, format = "ean_13"): void =>
    hub.phoneMessage(phone, JSON.stringify({ type: "scan", id, code, format }));
  const openRaw = (ip: string, userAgent: string | null = null): { socket: FakeSocket; phone: PhoneConnection } => {
    const socket = new FakeSocket();
    return { socket, phone: hub.phoneOpened(socket, ip, userAgent) };
  };
  return { registry, hub, logs, pairPhone, openTab, scan, openRaw };
}
