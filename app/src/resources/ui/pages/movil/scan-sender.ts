import type { ScanResultMessage } from "../../../../modules/phone/phone.protocol";
import type { CameraRead } from "../../phone-camera";
import { ScanDeduplicator } from "../../phone-scan/scan-deduplicator";
import { scanTone } from "../../phone-scan/scan-history";
import { link } from "./connection";
import { elements } from "./elements";
import { feedback, pulseGuide, showLastResult } from "./scan-feedback";
import { addPendingScan, markHistoryPendingLost, resolveHistoryScan } from "./scan-history-view";
import { restartAnimation } from "./view-utils";

export const dedup = new ScanDeduplicator();

let scanCounter = 0;

function nextScanId(): string {
  return `p${Date.now().toString(36)}${(++scanCounter).toString(36)}`;
}

export function sendCode(code: string, format: string): boolean {
  const id = nextScanId();
  if (!link.sendScan(id, code, format)) return false;
  addPendingScan({ id, code, tone: "pending", message: "Enviando…", at: Date.now() });
  pulseGuide("is-sending");
  return true;
}

export function handleCameraRead(read: CameraRead): void {
  if (!dedup.accept(read.code, performance.now())) return;
  if (sendCode(read.code, read.format)) restartAnimation(elements.flash, "is-on");
}

export function handleResult(result: ScanResultMessage): void {
  const tone = scanTone(result.status);
  if (!resolveHistoryScan(result.id, tone, result.message)) return;
  pulseGuide(`is-${tone}`);
  showLastResult(tone, result.message);
  feedback.play(tone === "success" ? "success" : "error");
}

export function handleDrop(): void {
  markHistoryPendingLost();
}
