function cameFromThisApp(): boolean {
  if (window.history.length <= 1 || document.referrer === "") return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Vuelve atrás en el historial si se llegó desde la app; si no, deja actuar al enlace. */
export function goBack(event: MouseEvent): void {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!cameFromThisApp()) return;
  event.preventDefault();
  window.history.back();
}
