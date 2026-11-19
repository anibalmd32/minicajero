import { requireElement } from "../../dom";

/** Elementos de la sección de tasa, buscados una sola vez al cargar. */
export const elements = {
  section: requireElement<HTMLElement>("tasa"),
  statusBadge: requireElement<HTMLElement>("rate-status-badge"),
  currentValue: requireElement<HTMLElement>("rate-current-value"),
  currentMeta: requireElement<HTMLElement>("rate-current-meta"),
  statusDetail: requireElement<HTMLElement>("rate-status-detail"),
  refreshButton: requireElement<HTMLButtonElement>("rate-refresh"),
  autoButton: requireElement<HTMLButtonElement>("rate-auto"),
  manualForm: requireElement<HTMLFormElement>("rate-manual-form"),
  manualRateInput: requireElement<HTMLInputElement>("rate_manual"),
  historyLoading: requireElement<HTMLElement>("rate-history-loading"),
  historyError: requireElement<HTMLElement>("rate-history-error"),
  historyErrorMessage: requireElement<HTMLElement>("rate-history-error-message"),
  historyRetry: requireElement<HTMLButtonElement>("rate-history-retry"),
  historyEmpty: requireElement<HTMLElement>("rate-history-empty"),
  historyTable: requireElement<HTMLElement>("rate-history"),
  historyBody: requireElement<HTMLTableSectionElement>("rate-history-body"),
  historyRange: requireElement<HTMLElement>("rate-history-range"),
  historyPrev: requireElement<HTMLButtonElement>("rate-history-prev"),
  historyNext: requireElement<HTMLButtonElement>("rate-history-next"),
};
