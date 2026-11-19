import type { PcTab, PeerSocket, PhoneConnection } from "./hub-types";
import { PcTabs } from "./pc-tabs";
import { type PhoneInfo, parsePcMessage, type ScanContext, type ScanMessage } from "./phone.protocol";
import { ScanRouter } from "./scan-router";
import { sendMessage } from "./socket-io";

/** Lado de la PC del hub: pestañas conectadas, a cuál van los escaneos y qué responde cada una. */
export class PcChannel {
  private readonly tabs = new PcTabs();
  private readonly scans: ScanRouter;
  private lastContext: ScanContext = "ninguno";

  constructor(
    scanTimeoutMs: number,
    private readonly listPhones: () => PhoneInfo[],
    private readonly onContextChange: (context: ScanContext) => void,
  ) {
    this.scans = new ScanRouter(this.tabs, scanTimeoutMs);
  }

  context(): ScanContext {
    return this.tabs.context();
  }

  open(socket: PeerSocket): PcTab {
    const tab = this.tabs.open(socket);
    sendMessage(socket, { type: "phones", phones: this.listPhones() });
    return tab;
  }

  message(tab: PcTab, raw: string): void {
    const message = parsePcMessage(raw);
    if (!message) return;
    if (message.type === "focus") {
      this.tabs.focus(tab, message.page, message.visible);
      this.publishContext();
    } else {
      this.scans.handlePcResult(tab, message);
    }
  }

  close(tab: PcTab): void {
    if (!this.tabs.close(tab)) return;
    this.scans.failTab(tab);
    this.publishContext();
  }

  broadcastPhones(): void {
    this.tabs.broadcast({ type: "phones", phones: this.listPhones() });
  }

  routeScan(phone: PhoneConnection, message: ScanMessage): void {
    this.scans.route(phone, message);
  }

  dropPhone(phone: PhoneConnection): void {
    this.scans.dropPhone(phone);
  }

  private publishContext(): void {
    const context = this.context();
    if (context === this.lastContext) return;
    this.lastContext = context;
    this.onContextChange(context);
  }
}
