import type { ScanTargetPage } from "../../modules/phone/phone.protocol";
import { PhoneEventsChannel } from "./phone-events/phone-events-channel";
import type { PhonesListener, ScanHandler } from "./phone-events/scan-types";

export type { ScanHandler, ScanReply } from "./phone-events/scan-types";

const phoneEvents = new PhoneEventsChannel();

/** Conecta esta pestaña al canal del escáner (lo hace el layout en todas las páginas). */
export function startPhoneEvents(): void {
  phoneEvents.start();
}

/** La página recibe los códigos escaneados con el teléfono (solo Ventas e Inventario). */
export function registerScanHandler(page: ScanTargetPage, handler: ScanHandler): void {
  phoneEvents.register(page, handler);
}

/** Avisa de los teléfonos conectados ahora y cada vez que cambian. Devuelve la función para dejar de escuchar. */
export function onPhonesChange(listener: PhonesListener): () => void {
  return phoneEvents.onPhones(listener);
}
