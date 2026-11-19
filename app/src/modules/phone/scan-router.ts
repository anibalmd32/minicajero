import type { PcTab, PhoneConnection } from "./hub-types";
import type { PcTabs } from "./pc-tabs";
import { normalizeScanCode, type ScanMessage, type ScanResultMessage, type ScanStatus } from "./phone.protocol";
import { PHONE_TEXTS } from "./phone-texts";
import { sendMessage } from "./socket-io";

interface PendingScan {
  phone: PhoneConnection;
  phoneScanId: string;
  tab: PcTab;
  timer: ReturnType<typeof setTimeout>;
}

const MAX_PENDING_SCANS_PER_PHONE = 5;

const DEFAULT_RESULT_MESSAGES: Record<ScanStatus, string> = {
  added: "Agregado",
  filled: "Código cargado",
  created: "Producto creado",
  found: "Producto encontrado",
  "not-found": "Producto no encontrado",
  "no-stock": "Sin stock",
  "no-target": PHONE_TEXTS.noTarget,
  error: "No se pudo procesar el código",
};

/** Reenvía los escaneos del teléfono a la pestaña de la PC que corresponde y devuelve su respuesta al teléfono. */
export class ScanRouter {
  private readonly pending = new Map<string, PendingScan>();
  private scanCounter = 0;

  constructor(
    private readonly tabs: PcTabs,
    private readonly scanTimeoutMs: number,
  ) {}

  route(phone: PhoneConnection, message: ScanMessage): void {
    const code = normalizeScanCode(message.code);
    const target = this.tabs.target();
    if (code === null) this.reply(phone, message.id, "error", PHONE_TEXTS.invalidCode);
    else if (!target) this.reply(phone, message.id, "no-target", PHONE_TEXTS.noTarget);
    else if (this.pendingCountOf(phone) >= MAX_PENDING_SCANS_PER_PHONE) {
      this.reply(phone, message.id, "error", PHONE_TEXTS.busy);
    } else this.forward(phone, message, code, target);
  }

  private forward(phone: PhoneConnection, message: ScanMessage, code: string, target: PcTab): void {
    const id = `s${++this.scanCounter}`;
    const timer = setTimeout(() => this.finish(id, "error", PHONE_TEXTS.timeout), this.scanTimeoutMs);
    this.pending.set(id, { phone, phoneScanId: message.id, tab: target, timer });
    if (phone.info) {
      sendMessage(target.socket, { type: "scan", id, code, format: message.format ?? "unknown", phone: phone.info });
    }
  }

  handlePcResult(tab: PcTab, result: ScanResultMessage): void {
    const scan = this.pending.get(result.id);
    if (!scan || scan.tab !== tab) return;
    this.finish(result.id, result.status, result.message || DEFAULT_RESULT_MESSAGES[result.status]);
  }

  dropPhone(phone: PhoneConnection): void {
    for (const [id, scan] of this.pending) {
      if (scan.phone !== phone) continue;
      clearTimeout(scan.timer);
      this.pending.delete(id);
    }
  }

  failTab(tab: PcTab): void {
    for (const [id, scan] of this.pending) {
      if (scan.tab === tab) this.finish(id, "error", PHONE_TEXTS.tabClosed);
    }
  }

  private pendingCountOf(phone: PhoneConnection): number {
    return [...this.pending.values()].filter((scan) => scan.phone === phone).length;
  }

  private reply(phone: PhoneConnection, id: string, status: ScanStatus, message: string): void {
    sendMessage(phone.socket, { type: "scan-result", id, status, message });
  }

  private finish(id: string, status: ScanStatus, message: string): void {
    const scan = this.pending.get(id);
    if (!scan) return;
    clearTimeout(scan.timer);
    this.pending.delete(id);
    this.reply(scan.phone, scan.phoneScanId, status, message);
  }
}
