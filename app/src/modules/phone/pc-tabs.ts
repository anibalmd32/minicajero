import type { PcTab, PeerSocket } from "./hub-types";
import { isScanTargetPage, type ScanContext, type ScanTargetPage, type ServerToPcMessage } from "./phone.protocol";
import { sendMessage } from "./socket-io";

/** Pestañas de la PC conectadas y cuál recibe los escaneos (la de Ventas o Inventario enfocada más recientemente). */
export class PcTabs {
  private readonly tabs = new Set<PcTab>();
  private focusCounter = 0;

  open(socket: PeerSocket): PcTab {
    const tab: PcTab = { socket, page: null, visible: false, focusOrder: 0 };
    this.tabs.add(tab);
    return tab;
  }

  close(tab: PcTab): boolean {
    return this.tabs.delete(tab);
  }

  focus(tab: PcTab, page: string, visible: boolean): void {
    tab.page = page;
    tab.visible = visible;
    if (visible) tab.focusOrder = ++this.focusCounter;
  }

  broadcast(message: ServerToPcMessage): void {
    for (const tab of this.tabs) sendMessage(tab.socket, message);
  }

  target(): PcTab | null {
    let best: PcTab | null = null;
    for (const tab of this.tabs) {
      if (tab.page === null || !isScanTargetPage(tab.page) || tab.focusOrder === 0) continue;
      if (!best || outranks(tab, best)) best = tab;
    }
    return best;
  }

  context(): ScanContext {
    const target = this.target();
    return target ? (target.page as ScanTargetPage) : "ninguno";
  }
}

function outranks(tab: PcTab, other: PcTab): boolean {
  if (tab.visible !== other.visible) return tab.visible;
  return tab.focusOrder > other.focusOrder;
}
