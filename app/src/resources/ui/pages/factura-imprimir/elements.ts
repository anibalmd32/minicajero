import { requireElement } from "../../dom";
import { requirePrintChrome } from "../../print-chrome";

/** Barra de impresión y estados comunes de la página. */
export const chrome = requirePrintChrome();

/** Elementos de la hoja de la factura, buscados una sola vez al cargar. */
export const elements = {
  sheet: requireElement<HTMLElement>("invoice-sheet"),
  watermark: requireElement<HTMLElement>("sheet-watermark"),
  numberText: requireElement<HTMLElement>("sheet-number"),
  dateText: requireElement<HTMLElement>("sheet-date"),
  timeText: requireElement<HTMLElement>("sheet-time"),
  voidNotice: requireElement<HTMLElement>("sheet-void"),
  customerName: requireElement<HTMLElement>("sheet-customer-name"),
  customerDocument: requireElement<HTMLElement>("sheet-customer-document"),
  customerPhone: requireElement<HTMLElement>("sheet-customer-phone"),
  paymentTypeText: requireElement<HTMLElement>("sheet-payment-type"),
  itemsBody: requireElement<HTMLTableSectionElement>("sheet-items"),
  rateText: requireElement<HTMLElement>("sheet-rate"),
  notesText: requireElement<HTMLElement>("sheet-notes"),
  subtotalText: requireElement<HTMLElement>("sheet-subtotal"),
  taxLabel: requireElement<HTMLElement>("sheet-tax-label"),
  taxText: requireElement<HTMLElement>("sheet-tax"),
  totalUsdText: requireElement<HTMLElement>("sheet-total-usd"),
  totalBsText: requireElement<HTMLElement>("sheet-total-bs"),
  creditSection: requireElement<HTMLElement>("sheet-credit"),
  paidText: requireElement<HTMLElement>("sheet-paid"),
  balanceText: requireElement<HTMLElement>("sheet-balance"),
  balanceNote: requireElement<HTMLElement>("sheet-balance-note"),
};
