import {
  PC_EVENTS_PATH,
  type PcScanMessage,
  type PcToServerMessage,
  type PhoneInfo,
  parseServerToPcMessage,
  type ScanTargetPage,
} from "../../../modules/phone/phone.protocol";
import { reconnectDelay } from "../phone-scan/reconnect-policy";
import { pageFromPath } from "./page-name";
import { processScan } from "./process-scan";
import type { PhonesListener, ScanHandler } from "./scan-types";

/**
 * Canal en tiempo real de esta pestaña con el escáner del teléfono: conecta el WebSocket local de eventos,
 * reconecta solo, informa en qué página está la pestaña y si se ve, avisa de los teléfonos conectados
 * y entrega cada código a la página (de uno en uno, en orden) para devolver su resultado al teléfono.
 */
export class PhoneEventsChannel {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private retryTimer: number | undefined;
  private page = pageFromPath(window.location.pathname);
  private handler: ScanHandler | null = null;
  private queue: Promise<void> = Promise.resolve();
  private phones: readonly PhoneInfo[] = [];
  private readonly listeners = new Set<PhonesListener>();
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    document.addEventListener("visibilitychange", () => this.reportFocus());
    window.addEventListener("focus", () => this.reportFocus());
    window.addEventListener("pagehide", () => this.socket?.close(1000));
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) this.reconnectNow();
    });
    window.addEventListener("online", () => this.reconnectNow());
    this.open();
  }

  register(page: ScanTargetPage, handler: ScanHandler): void {
    this.page = page;
    this.handler = handler;
    this.reportFocus();
  }

  onPhones(listener: PhonesListener): () => void {
    this.listeners.add(listener);
    listener(this.phones);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private open(): void {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}${PC_EVENTS_PATH}`);
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.attempt = 0;
      this.reportFocus();
    });
    socket.addEventListener("message", (event) => this.handleMessage(socket, event.data));
    socket.addEventListener("close", () => this.handleClose(socket));
  }

  private handleMessage(socket: WebSocket, data: unknown): void {
    if (socket !== this.socket || typeof data !== "string") return;
    const message = parseServerToPcMessage(data);
    if (message?.type === "phones") this.setPhones(message.phones);
    else if (message?.type === "scan") this.enqueue(socket, message);
  }

  private handleClose(socket: WebSocket): void {
    if (socket !== this.socket) return;
    this.socket = null;
    this.setPhones([]);
    this.retryTimer = window.setTimeout(() => this.open(), reconnectDelay(this.attempt++));
  }

  private reconnectNow(): void {
    if (this.socket || this.retryTimer === undefined) return;
    window.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.open();
  }

  private send(socket: WebSocket | null, message: PcToServerMessage): void {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private reportFocus(): void {
    this.send(this.socket, { type: "focus", page: this.page, visible: document.visibilityState === "visible" });
  }

  private setPhones(phones: readonly PhoneInfo[]): void {
    if (phones.length === 0 && this.phones.length === 0) return;
    this.phones = phones;
    for (const listener of this.listeners) listener(phones);
  }

  private enqueue(socket: WebSocket, scan: PcScanMessage): void {
    this.queue = this.queue.then(async () => {
      const reply = await processScan(this.handler, scan);
      this.send(socket, { type: "scan-result", id: scan.id, ...reply });
    });
  }
}
