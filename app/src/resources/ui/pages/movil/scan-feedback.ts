import { ScanFeedback } from "../../phone-feedback";
import type { ScanTone } from "../../phone-scan/scan-history";
import { elements } from "./elements";
import { statusIcon } from "./status-icon";
import { show } from "./view-utils";

const GUIDE_TONE_MS = 700;
const LAST_RESULT_MS = 3500;

export const feedback = new ScanFeedback();

let guideTimer: ReturnType<typeof setTimeout> | null = null;
let lastTimer: ReturnType<typeof setTimeout> | null = null;

export function pulseGuide(className: string): void {
  const { guide } = elements;
  guide.classList.remove("is-sending", "is-success", "is-warning", "is-danger");
  guide.classList.add(className);
  if (guideTimer !== null) clearTimeout(guideTimer);
  guideTimer = setTimeout(() => guide.classList.remove(className), GUIDE_TONE_MS);
}

export function showLastResult(tone: ScanTone, message: string): void {
  const { lastResult } = elements;
  const text = document.createElement("span");
  text.className = "phone-last-text";
  text.textContent = message;
  lastResult.replaceChildren(statusIcon(tone), text);
  lastResult.classList.remove("is-fading");
  show(lastResult, true);
  if (lastTimer !== null) clearTimeout(lastTimer);
  lastTimer = setTimeout(() => lastResult.classList.add("is-fading"), LAST_RESULT_MS);
}
