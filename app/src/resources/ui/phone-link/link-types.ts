import type { ScanContext, ScanResultMessage } from "../../../modules/phone/phone.protocol";

/** Estado de la conexión con la computadora. */
export type LinkState =
  | { kind: "connecting" }
  | { kind: "connected"; context: ScanContext }
  | { kind: "reconnecting"; stalled: boolean }
  | { kind: "ended"; text: string; reload: boolean };

/** Avisos de la conexión con la computadora. */
export interface PhoneLinkHandlers {
  onState(state: LinkState): void;
  onResult(result: ScanResultMessage): void;
  /** La conexión se cortó: los escaneos sin respuesta ya no la recibirán. */
  onDrop(): void;
}
