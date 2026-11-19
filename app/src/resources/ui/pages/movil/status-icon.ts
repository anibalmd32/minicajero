import type { ScanTone } from "../../phone-scan/scan-history";

const TONE_ICONS: Record<ScanTone, string> = { pending: "", success: "✓", warning: "!", danger: "✕" };

export function statusIcon(tone: ScanTone): HTMLElement {
  const icon = document.createElement("span");
  icon.className = `phone-status-icon tone-${tone}`;
  icon.setAttribute("aria-hidden", "true");
  if (tone === "pending") {
    const spinner = document.createElement("span");
    spinner.className = "spinner-border spinner-border-sm";
    icon.append(spinner);
  } else {
    icon.textContent = TONE_ICONS[tone];
  }
  return icon;
}
