import type { PcScanMessage, PhoneInfo, ScanStatus } from "../../../modules/phone/phone.protocol";

/** Respuesta de la página a un código escaneado; el teléfono la muestra tal cual. */
export interface ScanReply {
  status: ScanStatus;
  message: string;
}

/**
 * Procesa un código escaneado en el teléfono y dice cómo le fue. Si `signal` se anula, al teléfono ya se le dijo
 * que falló: el manejador no debe aplicar nada (`signal.throwIfAborted()` tras cada espera).
 */
export type ScanHandler = (scan: PcScanMessage, signal: AbortSignal) => Promise<ScanReply>;

export type PhonesListener = (phones: readonly PhoneInfo[]) => void;
