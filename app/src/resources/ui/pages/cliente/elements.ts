import { Modal } from "../../bootstrap";
import { requireElement } from "../../dom";
import { createPaymentForm } from "../../payment-form";

const paymentModalElement = requireElement<HTMLElement>("statement-payment-modal");

/** Elementos de la página del estado de cuenta, buscados una sola vez al cargar. */
export const elements = {
  titleText: requireElement<HTMLElement>("statement-title"),
  subtitleText: requireElement<HTMLElement>("statement-subtitle"),
  invoicesLink: requireElement<HTMLAnchorElement>("statement-invoices"),
  printLink: requireElement<HTMLAnchorElement>("statement-print"),
  payButton: requireElement<HTMLButtonElement>("statement-pay"),
  loading: requireElement<HTMLElement>("statement-loading"),
  loadError: requireElement<HTMLElement>("statement-error"),
  loadErrorMessage: requireElement<HTMLElement>("statement-error-message"),
  retryButton: requireElement<HTMLButtonElement>("statement-retry"),
  content: requireElement<HTMLElement>("statement-content"),
  balancePrimary: requireElement<HTMLElement>("statement-balance-primary"),
  balanceSecondary: requireElement<HTMLElement>("statement-balance-secondary"),
  balanceNote: requireElement<HTMLElement>("statement-balance-note"),
  pendingCount: requireElement<HTMLElement>("statement-pending-count"),
  creditTotal: requireElement<HTMLElement>("statement-credit-total"),
  paidTotal: requireElement<HTMLElement>("statement-paid-total"),
  cashTotal: requireElement<HTMLElement>("statement-cash-total"),
  pendingSection: requireElement<HTMLElement>("statement-pending"),
  pendingBody: requireElement<HTMLTableSectionElement>("statement-pending-body"),
  entriesCount: requireElement<HTMLElement>("statement-entries-count"),
  entriesEmpty: requireElement<HTMLElement>("statement-empty"),
  entriesTable: requireElement<HTMLElement>("statement-entries"),
  entriesBody: requireElement<HTMLTableSectionElement>("statement-entries-body"),
  paymentModalElement,
  paymentModal: Modal.getOrCreateInstance(paymentModalElement),
  paymentForm: createPaymentForm(requireElement<HTMLFormElement>("statement-payment-form"), "statement-payment"),
};
