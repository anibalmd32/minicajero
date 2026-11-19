import { elements } from "./elements";

export const CONFIRM_WORD = "RESTAURAR";

/** Si hay una restauración en curso (bloquea cerrar el modal y reenviar). */
export const restoreState = { restoring: false };

export function selectedFile(): File | null {
  return elements.restoreFile.files?.[0] ?? null;
}

export function isRestoreConfirmed(): boolean {
  return selectedFile() !== null && elements.restoreConfirm.value.trim().toUpperCase() === CONFIRM_WORD;
}

export function updateRestoreSubmit(): void {
  if (!restoreState.restoring) elements.restoreSubmit.disabled = !isRestoreConfirmed();
}

export function resetRestoreForm(): void {
  elements.restoreForm.reset();
  elements.restoreForm.classList.remove("d-none");
  elements.restoreDone.classList.add("d-none");
  elements.restoreFooter.classList.remove("d-none");
  updateRestoreSubmit();
}

export function showRestoreDone(): void {
  elements.restoreForm.classList.add("d-none");
  elements.restoreFooter.classList.add("d-none");
  elements.restoreDone.classList.remove("d-none");
}
