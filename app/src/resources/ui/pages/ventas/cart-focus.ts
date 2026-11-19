import { cartElements } from "./cart-elements";
import { lineItem } from "./cart-line";

export interface FocusedControl {
  id: number;
  action: string;
  selection: [number, number] | null;
}

export function focusedControl(): FocusedControl | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !cartElements.cartLines.contains(active)) return null;
  const item = active.closest<HTMLElement>(".pos-line");
  const action = active.dataset.action;
  if (!item || !action) return null;
  const selection =
    active instanceof HTMLInputElement
      ? ([active.selectionStart ?? 0, active.selectionEnd ?? 0] as [number, number])
      : null;
  return { id: Number(item.dataset.id), action, selection };
}

export function restoreFocus(previous: FocusedControl | null): void {
  if (!previous) return;
  const control = lineItem(previous.id)?.querySelector<HTMLElement>(`[data-action="${previous.action}"]`);
  if (!control || (control instanceof HTMLButtonElement && control.disabled)) {
    lineItem(previous.id)?.querySelector<HTMLInputElement>('[data-action="quantity"]')?.focus();
    return;
  }
  control.focus();
  if (control instanceof HTMLInputElement && previous.selection) control.setSelectionRange(...previous.selection);
}
