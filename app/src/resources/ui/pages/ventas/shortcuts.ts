import { elements } from "./elements";
import { charge } from "./review-open";

function isChargeShortcut(event: KeyboardEvent): boolean {
  return event.key === "F4" || (event.key === "Enter" && (event.ctrlKey || event.metaKey));
}

function isModalOpen(): boolean {
  return document.body.classList.contains("modal-open");
}

export function onGlobalKeyDown(event: KeyboardEvent): void {
  if (event.key === "F2") {
    event.preventDefault();
    if (isModalOpen()) return;
    elements.searchInput.focus();
    elements.searchInput.select();
    return;
  }
  if (isChargeShortcut(event) && !isModalOpen()) {
    event.preventDefault();
    event.stopPropagation();
    charge();
  }
}
