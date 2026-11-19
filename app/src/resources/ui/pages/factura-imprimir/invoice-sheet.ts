import { formatDate, formatTime } from "../../format";
import { type Invoice, invoiceNumberLabel, PAYMENT_TYPE_LABELS } from "../../invoices";
import { renderBusinessHeader } from "../../print-page";
import type { BusinessSettings } from "../../settings";
import { chrome, elements } from "./elements";
import { renderCredit } from "./invoice-credit";
import { renderCustomer, renderTotals, renderVoid } from "./invoice-header";
import { itemRow } from "./invoice-items";

function documentTitle(invoice: Invoice, business: BusinessSettings | null): string {
  const name = business?.business_name.trim();
  return `Factura ${invoice.number}${name ? ` - ${name}` : ""}`;
}

/** Pinta la hoja completa de la factura. */
export function renderInvoice(invoice: Invoice, business: BusinessSettings | null): void {
  renderBusinessHeader(business);
  elements.numberText.textContent = invoiceNumberLabel(invoice.number);
  elements.dateText.textContent = formatDate(invoice.created_at);
  elements.timeText.textContent = formatTime(invoice.created_at);
  renderVoid(invoice);
  renderCustomer(invoice);
  elements.paymentTypeText.textContent = PAYMENT_TYPE_LABELS[invoice.payment_type];
  elements.itemsBody.replaceChildren(...invoice.items.map(itemRow));
  renderTotals(invoice);
  renderCredit(invoice);
  elements.sheet.classList.toggle("is-void", invoice.status === "void");
  chrome.toolbarTitle.textContent = `Factura ${invoiceNumberLabel(invoice.number)}`;
  document.title = documentTitle(invoice, business);
}
