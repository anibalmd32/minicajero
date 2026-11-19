import { Modal } from "../../bootstrap";
import { requireElement } from "../../dom";

const restoreModalElement = requireElement<HTMLElement>("restore-modal");

/** Elementos de la sección de respaldo, buscados una sola vez al cargar. */
export const elements = {
  downloadButton: requireElement<HTMLButtonElement>("backup-download"),
  restoreOpenButton: requireElement<HTMLButtonElement>("backup-restore-open"),
  retention: requireElement<HTMLElement>("backup-retention"),
  directoryRow: requireElement<HTMLElement>("backup-directory-row"),
  directory: requireElement<HTMLElement>("backup-directory"),
  listLoading: requireElement<HTMLElement>("backup-list-loading"),
  listError: requireElement<HTMLElement>("backup-list-error"),
  listErrorMessage: requireElement<HTMLElement>("backup-list-error-message"),
  listRetry: requireElement<HTMLButtonElement>("backup-list-retry"),
  listEmpty: requireElement<HTMLElement>("backup-list-empty"),
  listTable: requireElement<HTMLElement>("backup-list"),
  listBody: requireElement<HTMLTableSectionElement>("backup-list-body"),
  restoreModalElement,
  restoreForm: requireElement<HTMLFormElement>("restore-form"),
  restoreFile: requireElement<HTMLInputElement>("restore_file"),
  restoreConfirm: requireElement<HTMLInputElement>("restore_confirm"),
  restoreSubmit: requireElement<HTMLButtonElement>("restore-submit"),
  restoreDone: requireElement<HTMLElement>("restore-done"),
  restoreFooter: requireElement<HTMLElement>("restore-footer"),
  restoreModal: Modal.getOrCreateInstance(restoreModalElement),
};
