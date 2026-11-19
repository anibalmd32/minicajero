import type { ScanContext, ScanStatus } from "./protocol-constants";

/** Teléfono conectado, tal como se muestra en la PC. */
export interface PhoneInfo {
  id: string;
  /** Descripción corta del dispositivo (`Android · Chrome`). */
  name: string;
  connected_at: string;
  last_seen_at: string;
}

/** Teléfono → servidor: se identifica con el token del QR (o el de sesión al reconectar). */
export interface HelloMessage {
  type: "hello";
  version: number;
  token: string;
  device?: string;
}

/** Teléfono → servidor: código leído. `id` lo elige el teléfono para reconocer la respuesta. */
export interface ScanMessage {
  type: "scan";
  id: string;
  code: string;
  format?: string;
}

/** Teléfono → servidor: el usuario desconectó el teléfono; su sesión deja de servir para reconectar. */
export interface ByeMessage {
  type: "bye";
}

/** Servidor → teléfono: conexión aceptada. `session` sirve para reconectar sin volver a escanear el QR. */
export interface ReadyMessage {
  type: "ready";
  version: number;
  session: string;
  phone: PhoneInfo;
  context: ScanContext;
}

/** Servidor → teléfono y PC → servidor: resultado de un escaneo. */
export interface ScanResultMessage {
  type: "scan-result";
  id: string;
  status: ScanStatus;
  message: string;
}

/** Servidor → teléfono: a qué pantalla de la PC están yendo los escaneos. */
export interface ContextMessage {
  type: "context";
  context: ScanContext;
}

/** PC → servidor: la pestaña informa en qué página está y si se ve. */
export interface FocusMessage {
  type: "focus";
  page: string;
  visible: boolean;
}

/** Servidor → PC: un teléfono leyó un código. Responder con `scan-result` y el mismo `id`. */
export interface PcScanMessage {
  type: "scan";
  id: string;
  code: string;
  format: string;
  phone: PhoneInfo;
}

/** Servidor → PC: teléfonos conectados ahora mismo. */
export interface PhonesMessage {
  type: "phones";
  phones: PhoneInfo[];
}

/** Mensajes que envía el teléfono. */
export type PhoneToServerMessage = HelloMessage | ScanMessage | ByeMessage;

/** Mensajes que recibe el teléfono. */
export type ServerToPhoneMessage = ReadyMessage | ScanResultMessage | ContextMessage;

/** Mensajes que envía una pestaña de la PC. */
export type PcToServerMessage = FocusMessage | ScanResultMessage;

/** Mensajes que recibe una pestaña de la PC. */
export type ServerToPcMessage = PcScanMessage | PhonesMessage;
