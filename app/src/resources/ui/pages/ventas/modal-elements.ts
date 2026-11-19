import { Modal, Offcanvas } from "../../bootstrap";
import { requireElement } from "../../dom";
import { cartElements } from "./cart-elements";

/** Elementos del modal de cobro, buscados una sola vez al cargar. */
export const modalElements = {
  saleModalElement: requireElement<HTMLElement>("sale-modal"),
  saleModalTitle: requireElement<HTMLElement>("sale-modal-title"),
  reviewView: requireElement<HTMLElement>("sale-review"),
  reviewTotalLabel: requireElement<HTMLElement>("sale-review-total-label"),
  reviewDebt: requireElement<HTMLElement>("sale-review-debt"),
  reviewDebtBefore: requireElement<HTMLElement>("sale-review-debt-before"),
  reviewDebtAfter: requireElement<HTMLElement>("sale-review-debt-after"),
  changeForm: requireElement<HTMLFormElement>("sale-change-form"),
  receivedInput: requireElement<HTMLInputElement>("sale-received"),
  receivedCurrencyInputs: [...document.querySelectorAll<HTMLInputElement>('input[name="sale-received-currency"]')],
  changeResult: requireElement<HTMLElement>("sale-change-result"),
  reviewItems: requireElement<HTMLDetailsElement>("sale-review-items"),
  reviewItemsSummary: requireElement<HTMLElement>("sale-review-items-summary"),
  reviewCustomer: requireElement<HTMLElement>("sale-review-customer"),
  reviewPayment: requireElement<HTMLElement>("sale-review-payment"),
  reviewLines: requireElement<HTMLTableSectionElement>("sale-review-lines"),
  reviewSubtotal: requireElement<HTMLElement>("sale-review-subtotal"),
  reviewTaxRow: requireElement<HTMLElement>("sale-review-tax-row"),
  reviewTaxLabel: requireElement<HTMLElement>("sale-review-tax-label"),
  reviewTax: requireElement<HTMLElement>("sale-review-tax"),
  reviewTotalPrimary: requireElement<HTMLElement>("sale-review-total-primary"),
  reviewTotalSecondary: requireElement<HTMLElement>("sale-review-total-secondary"),
  reviewRate: requireElement<HTMLElement>("sale-review-rate"),
  reviewError: requireElement<HTMLElement>("sale-review-error"),
  reviewChanges: requireElement<HTMLElement>("sale-review-changes"),
  reviewActions: requireElement<HTMLElement>("sale-review-actions"),
  submitButton: requireElement<HTMLButtonElement>("sale-submit"),
  doneView: requireElement<HTMLElement>("sale-done"),
  doneTitle: requireElement<HTMLElement>("sale-done-title"),
  doneText: requireElement<HTMLElement>("sale-done-text"),
  doneTotal: requireElement<HTMLElement>("sale-done-total"),
  doneExtra: requireElement<HTMLElement>("sale-done-extra"),
  doneActions: requireElement<HTMLElement>("sale-done-actions"),
  printButton: requireElement<HTMLButtonElement>("sale-print"),
  newSaleButton: requireElement<HTMLButtonElement>("sale-new"),
};

export const saleModal = Modal.getOrCreateInstance(modalElements.saleModalElement);
export const cartOffcanvas = Offcanvas.getOrCreateInstance(cartElements.cartPanel);
