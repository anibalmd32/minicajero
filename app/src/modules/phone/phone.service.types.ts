import type { LocalAddress } from "./network";
import type { Clock } from "./pairing";
import type { PhoneInfo, ScanContext } from "./phone.protocol";

/** Archivo, dentro de `<datos>/movil/`, donde se recuerda el puerto del servidor del teléfono. */
export const PHONE_PORT_FILE = "puerto.txt";

/** Tiempo sin teléfonos conectados ni QR pendiente tras el que se apaga el servidor del teléfono. */
export const IDLE_SHUTDOWN_MS = 15 * 60 * 1000;

/** Dirección por la que el teléfono puede abrir la página, con su QR. */
export interface PairingUrl {
  ip: string;
  label: string;
  url: string;
  qr_svg: string;
}

/** Respuesta de `POST /api/v1/phone/pairing`. La primera URL es la recomendada. */
export interface PairingInfo {
  urls: PairingUrl[];
  qr_svg: string;
  expires_at: string;
  port: number;
}

/** Respuesta de `GET /api/v1/phone/status`. */
export interface PhoneStatus {
  active: boolean;
  port: number | null;
  pairing_expires_at: string | null;
  context: ScanContext;
  phones: PhoneInfo[];
}

/** Dependencias del escáner (inyectables para pruebas). */
export interface PhoneScannerOptions {
  dataDir: string;
  appPort: number;
  clock?: Clock;
  addresses?: () => LocalAddress[];
  idleShutdownMs?: number;
  sweepIntervalMs?: number;
  scanTimeoutMs?: number;
  helloTimeoutMs?: number;
  log?: (message: string) => void;
}
