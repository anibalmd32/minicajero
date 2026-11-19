import {
  PHONE_SOCKET_PATH,
  type PhoneToServerMessage,
  parseServerToPhoneMessage,
  type ServerToPhoneMessage,
} from "../../../modules/phone/phone.protocol";
import { closeOutcome, EXPIRED_LINK_TEXT, USER_DISCONNECTED_TEXT } from "../phone-scan/close-outcome";
import { isLinkStalled, reconnectDelay } from "../phone-scan/reconnect-policy";
import { helloMessage } from "./hello-message";
import type { LinkState, PhoneLinkHandlers } from "./link-types";
import { saveSession } from "./session-storage";

const OPEN_TIMEOUT_MS = 10_000;

/** WebSocket con la computadora: se identifica, reconecta solo con la sesión y avisa de cada cambio. */
export class PhoneLink {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private lostSince: number | null = null;
  private state: LinkState = { kind: "connecting" };

  constructor(private readonly handlers: PhoneLinkHandlers) {}

  /** Estado actual. */
  get current(): LinkState {
    return this.state;
  }

  /** Empieza a conectar con el token del QR o el de sesión. Sin token, termina con el aviso de enlace vencido. */
  start(token: string | null): void {
    if (!token) {
      this.end(EXPIRED_LINK_TEXT, false);
      return;
    }
    this.token = token;
    saveSession(token);
    this.open();
  }

  /** Envía un código. Devuelve `false` si ahora no hay conexión. */
  sendScan(id: string, code: string, format: string): boolean {
    if (this.state.kind !== "connected") return false;
    return this.send({ type: "scan", id, code, format });
  }

  /** Si se está esperando para reintentar, reintenta ya (al volver la red o la pantalla). */
  retryNow(): void {
    if (this.state.kind !== "reconnecting" || this.retryTimer === null) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.open();
  }

  /** Desconecta este teléfono, avisa a la computadora para que anule la sesión y la olvida. */
  disconnect(): void {
    this.send({ type: "bye" });
    this.end(USER_DISCONNECTED_TEXT, false);
  }

  private setState(state: LinkState): void {
    this.state = state;
    this.handlers.onState(state);
  }

  private send(message: PhoneToServerMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  private open(): void {
    if (this.state.kind !== "reconnecting") this.setState({ kind: "connecting" });
    const socket = new WebSocket(`wss://${location.host}${PHONE_SOCKET_PATH}`);
    this.socket = socket;
    this.openTimer = setTimeout(() => socket.close(), OPEN_TIMEOUT_MS);
    socket.addEventListener("open", () => this.send(helloMessage(this.token)));
    socket.addEventListener("message", (event) => {
      if (socket !== this.socket || typeof event.data !== "string") return;
      const message = parseServerToPhoneMessage(event.data);
      if (message) this.handleMessage(message);
    });
    socket.addEventListener("close", (event) => {
      if (socket === this.socket) this.handleClose(event.code);
    });
  }

  private handleMessage(message: ServerToPhoneMessage): void {
    if (message.type === "ready") {
      this.clearOpenTimer();
      this.token = message.session;
      saveSession(message.session);
      this.attempt = 0;
      this.lostSince = null;
      this.setState({ kind: "connected", context: message.context });
    } else if (message.type === "context" && this.state.kind === "connected") {
      this.setState({ kind: "connected", context: message.context });
    } else if (message.type === "scan-result") {
      this.handlers.onResult(message);
    }
  }

  private handleClose(code: number): void {
    this.clearOpenTimer();
    this.socket = null;
    this.handlers.onDrop();
    const outcome = closeOutcome(code);
    if (outcome.kind === "end") {
      this.end(outcome.text, outcome.reload);
      return;
    }
    const now = Date.now();
    this.lostSince ??= now;
    this.setState({ kind: "reconnecting", stalled: isLinkStalled(this.lostSince, now) });
    this.retryTimer = setTimeout(
      () => {
        this.retryTimer = null;
        this.open();
      },
      reconnectDelay(this.attempt++),
    );
  }

  private end(text: string, reload: boolean): void {
    this.clearOpenTimer();
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.close(1000);
      this.handlers.onDrop();
    }
    this.token = null;
    if (!reload) saveSession(null);
    this.setState({ kind: "ended", text, reload });
  }

  private clearOpenTimer(): void {
    if (this.openTimer !== null) clearTimeout(this.openTimer);
    this.openTimer = null;
  }
}
