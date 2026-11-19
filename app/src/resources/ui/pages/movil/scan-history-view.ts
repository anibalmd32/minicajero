import {
  markPendingScansLost,
  pushScan,
  resolveScan,
  type ScanEntry,
  type ScanTone,
} from "../../phone-scan/scan-history";
import { elements } from "./elements";
import { statusIcon } from "./status-icon";
import { show } from "./view-utils";

const TIME_FORMAT = new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", second: "2-digit" });

let recentScans: ScanEntry[] = [];

function historyItem(entry: ScanEntry): HTMLLIElement {
  const item = document.createElement("li");
  const body = document.createElement("div");
  body.className = "phone-history-body";
  const top = document.createElement("div");
  top.className = "phone-history-top";
  const code = document.createElement("span");
  code.className = "phone-history-code";
  code.textContent = entry.code;
  const time = document.createElement("time");
  time.className = "phone-history-time";
  time.dateTime = new Date(entry.at).toISOString();
  time.textContent = TIME_FORMAT.format(entry.at);
  top.append(code, time);
  const message = document.createElement("p");
  message.className = `phone-history-message tone-${entry.tone}`;
  message.textContent = entry.message;
  body.append(top, message);
  item.append(statusIcon(entry.tone), body);
  return item;
}

export function renderHistory(): void {
  elements.historyList.replaceChildren(...recentScans.map(historyItem));
  show(elements.historyEmpty, recentScans.length === 0);
}

export function addPendingScan(entry: ScanEntry): void {
  recentScans = pushScan(recentScans, entry);
  renderHistory();
}

export function resolveHistoryScan(id: string, tone: ScanTone, message: string): boolean {
  const updated = resolveScan(recentScans, id, tone, message);
  if (!updated) return false;
  recentScans = updated;
  renderHistory();
  return true;
}

export function markHistoryPendingLost(): void {
  if (!recentScans.some((entry) => entry.tone === "pending")) return;
  recentScans = markPendingScansLost(recentScans);
  renderHistory();
}
