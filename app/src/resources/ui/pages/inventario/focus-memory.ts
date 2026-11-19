import { restoreRowFocus } from "../../list";
import { elements } from "./elements";
import { session } from "./inventory-state";

export function rememberFocus(): void {
  session.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export function restoreRememberedFocus(): void {
  restoreRowFocus(session.returnFocusTo, elements.tableBody);
  session.returnFocusTo = null;
}
