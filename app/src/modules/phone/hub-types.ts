import type { Clock, PairingRegistry, PhoneSession } from "./pairing";
import type { PhoneInfo } from "./phone.protocol";

/** Extremo de un WebSocket (lo que el hub necesita de `ServerWebSocket`). */
export interface PeerSocket {
  send(data: string): unknown;
  close(code?: number, reason?: string): void;
}

/** Datos de la conexión de un teléfono. */
export interface PhoneConnection {
  readonly socket: PeerSocket;
  readonly ip: string;
  readonly userAgent: string | null;
  session: PhoneSession | null;
  info: PhoneInfo | null;
  helloTimer: ReturnType<typeof setTimeout> | null;
}

/** Datos de la conexión de una pestaña de la PC. */
export interface PcTab {
  readonly socket: PeerSocket;
  page: string | null;
  visible: boolean;
  focusOrder: number;
}

/** Opciones del hub (los tiempos son inyectables para las pruebas). */
export interface PhoneHubOptions {
  registry: PairingRegistry;
  clock?: Clock;
  scanTimeoutMs?: number;
  helloTimeoutMs?: number;
  log?: (message: string) => void;
  onChange?: () => void;
}
