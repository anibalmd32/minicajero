import type { PairingInfo, PairingUrl } from "../../../modules/phone/phone.service";
import type { ModalParts } from "./modal-parts";

function networkLabels(urls: readonly PairingUrl[]): string[] {
  return urls.map((url, index) => {
    const repeated = urls.filter((other) => other.label === url.label).length > 1;
    const position = urls.slice(0, index + 1).filter((other) => other.label === url.label).length;
    return repeated ? `${url.label} (${position})` : url.label;
  });
}

export function renderNetworks(ui: ModalParts, info: PairingInfo): void {
  const labels = networkLabels(info.urls);
  const previous = ui.network.value;
  ui.network.replaceChildren(
    ...info.urls.map((url, index) => {
      const option = document.createElement("option");
      option.value = url.ip;
      option.textContent = labels[index] ?? url.label;
      return option;
    }),
  );
  if (info.urls.some((url) => url.ip === previous)) ui.network.value = previous;
  ui.networks.classList.toggle("d-none", info.urls.length < 2);
}
