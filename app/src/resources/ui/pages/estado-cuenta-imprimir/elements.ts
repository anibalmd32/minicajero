import { requireElement } from "../../dom";
import { requirePrintChrome } from "../../print-chrome";

/** Barra de impresión y estados comunes de la página. */
export const chrome = requirePrintChrome();

/** Elementos de la hoja del estado de cuenta, buscados una sola vez al cargar. */
export const elements = {
  sheet: requireElement<HTMLElement>("statement-sheet"),
  dateText: requireElement<HTMLElement>("sheet-date"),
  timeText: requireElement<HTMLElement>("sheet-time"),
  customerName: requireElement<HTMLElement>("sheet-customer-name"),
  customerDocument: requireElement<HTMLElement>("sheet-customer-document"),
  customerPhone: requireElement<HTMLElement>("sheet-customer-phone"),
  balanceHead: requireElement<HTMLElement>("sheet-balance-head"),
  entriesBody: requireElement<HTMLTableSectionElement>("sheet-entries"),
  emptyText: requireElement<HTMLElement>("sheet-empty"),
  rateText: requireElement<HTMLElement>("sheet-rate"),
  creditTotal: requireElement<HTMLElement>("sheet-credit-total"),
  paidTotal: requireElement<HTMLElement>("sheet-paid-total"),
  balanceUsd: requireElement<HTMLElement>("sheet-balance-usd"),
  balanceBs: requireElement<HTMLElement>("sheet-balance-bs"),
};
