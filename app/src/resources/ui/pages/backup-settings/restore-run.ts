import { ApiError } from "../../api";
import { restoreBackup } from "../../backups";
import { clearFieldErrors, reportFormError, showFieldErrors, withBusyButton } from "../../form";
import { elements } from "./elements";
import {
  CONFIRM_WORD,
  isRestoreConfirmed,
  restoreState,
  selectedFile,
  showRestoreDone,
  updateRestoreSubmit,
} from "./restore-form";

const RELOAD_DELAY_MS = 1500;

async function submitRestore(): Promise<void> {
  const file = selectedFile();
  if (!file || !isRestoreConfirmed()) {
    throw new ApiError(400, "Completa los datos para restaurar", {
      ...(file ? {} : { file: "Selecciona un archivo de respaldo" }),
      confirm: `Escribe ${CONFIRM_WORD} para confirmar`,
    });
  }
  restoreState.restoring = true;
  try {
    await restoreBackup(file);
  } catch (err) {
    restoreState.restoring = false;
    throw err;
  }
  showRestoreDone();
  setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
}

function reportRestoreError(err: unknown): void {
  if (err instanceof ApiError && err.status === 400 && !err.hasFieldErrors) {
    showFieldErrors(elements.restoreForm, { file: err.message });
    return;
  }
  reportFormError(elements.restoreForm, err);
}

export async function runRestore(): Promise<void> {
  if (restoreState.restoring) return;
  clearFieldErrors(elements.restoreForm);
  try {
    await withBusyButton(elements.restoreSubmit, submitRestore, "Restaurando…");
  } catch (err) {
    reportRestoreError(err);
  } finally {
    updateRestoreSubmit();
  }
}
