import { STATUS_CLASSES, STATUS_CLEAR_MS, type StatusTone } from "./constants";
import { elements } from "./elements";
import { state } from "./state";

export function showStatus(message: string, tone: StatusTone): void {
  const { searchStatus } = elements;
  window.clearTimeout(state.statusTimer);
  searchStatus.className = `pos-search-status small ${STATUS_CLASSES[tone]}`;
  searchStatus.textContent = message;
  searchStatus.title = message;
  state.statusTimer = window.setTimeout(() => {
    searchStatus.textContent = "";
    searchStatus.title = "";
  }, STATUS_CLEAR_MS);
}
