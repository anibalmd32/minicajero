import type { PcScanMessage } from "../../../../modules/phone/phone.protocol";
import { closePhoneModal, otherOpenModal } from "../../phone-connect";
import type { ScanReply } from "../../phone-events";
import { elements } from "./elements";
import { fillScannedCode } from "./scan-fill";
import { lookUpScannedCode } from "./scan-lookup";
import { stockElements } from "./stock-elements";

/** Atiende un código escaneado con el teléfono según el diálogo abierto en la computadora. */
export async function onPhoneScan(scan: PcScanMessage, signal: AbortSignal): Promise<ScanReply> {
  await closePhoneModal();
  signal.throwIfAborted();
  if (elements.productModalElement.classList.contains("show")) return fillScannedCode(scan.code, signal);
  if (stockElements.modalElement.classList.contains("show")) {
    return { status: "no-target", message: "Termina el ajuste de stock en la computadora" };
  }
  if (otherOpenModal()) return { status: "no-target", message: "Termina lo que estás haciendo en la computadora" };
  return lookUpScannedCode(scan.code, signal);
}
