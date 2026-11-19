import { clearFieldErrors } from "../../form";
import { elements } from "./elements";
import { resetRestoreForm, restoreState, updateRestoreSubmit } from "./restore-form";
import { runRestore } from "./restore-run";

export function bindRestoreModal(): void {
  const { restoreOpenButton, restoreModalElement, restoreModal, restoreFile, restoreConfirm, restoreForm } = elements;
  restoreOpenButton.addEventListener("click", () => {
    resetRestoreForm();
    restoreModal.show();
  });
  restoreModalElement.addEventListener("shown.bs.modal", () => restoreFile.focus());
  restoreModalElement.addEventListener("hide.bs.modal", (event) => {
    if (restoreState.restoring) event.preventDefault();
  });
  restoreFile.addEventListener("change", () => {
    clearFieldErrors(restoreForm, "file");
    updateRestoreSubmit();
  });
  restoreConfirm.addEventListener("input", () => {
    clearFieldErrors(restoreForm, "confirm");
    updateRestoreSubmit();
  });
  restoreForm.noValidate = true;
  restoreForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runRestore();
  });
}
