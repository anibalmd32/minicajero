import { type PcScanMessage, SCAN_TIMEOUT_MS } from "../../../modules/phone/phone.protocol";
import type { ScanHandler, ScanReply } from "./scan-types";

const FAILED_SCAN_TEXT = "No se pudo procesar el código. Intenta de nuevo.";
const HANDLER_TIMEOUT_MS = SCAN_TIMEOUT_MS - 1000;

export async function processScan(handler: ScanHandler | null, scan: PcScanMessage): Promise<ScanReply> {
  if (!handler) return { status: "no-target", message: "" };
  const controller = new AbortController();
  let timer: number | undefined;
  const timedOut = new Promise<ScanReply>((resolve) => {
    timer = window.setTimeout(() => {
      controller.abort();
      resolve({ status: "error", message: FAILED_SCAN_TEXT });
    }, HANDLER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([handler(scan, controller.signal), timedOut]);
  } catch (err) {
    console.error(err);
    return { status: "error", message: FAILED_SCAN_TEXT };
  } finally {
    window.clearTimeout(timer);
  }
}
