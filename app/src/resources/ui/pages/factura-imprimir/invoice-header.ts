import { customerFullName, formatPhone } from "../../customers";
import { asSentence, formatBs, formatDate, formatDecimalInput, formatRate, formatTime, formatUsd } from "../../format";
import type { Invoice } from "../../invoices";
import { textElement } from "../../list";
import { formatDualSnapshot } from "../../money";
import { setOptionalLine } from "../../print-page";
import { elements } from "./elements";

/** Pinta la marca y el aviso de factura anulada. */
export function renderVoid(invoice: Invoice): void {
  const isVoid = invoice.status === "void";
  elements.watermark.classList.toggle("d-none", !isVoid);
  elements.voidNotice.classList.toggle("d-none", !isVoid);
  if (!isVoid) return;
  const when = invoice.voided_at ? ` el ${formatDate(invoice.voided_at)} a las ${formatTime(invoice.voided_at)}` : "";
  const reason = invoice.void_reason ? ` Motivo: ${asSentence(invoice.void_reason)}` : "";
  elements.voidNotice.replaceChildren(
    textElement("strong", asSentence(`Factura anulada${when}`)),
    document.createTextNode(reason),
  );
}

/** Pinta los datos del cliente (o «Consumidor final»). */
export function renderCustomer(invoice: Invoice): void {
  const customer = invoice.customer;
  elements.customerName.textContent = customer ? customerFullName(customer) : "Consumidor final";
  setOptionalLine(elements.customerDocument, customer ? `Documento: ${customer.document}` : "");
  const phone = formatPhone(customer?.phone ?? null);
  setOptionalLine(elements.customerPhone, phone ? `Teléfono: ${phone}` : "");
}

/** Pinta subtotal, IVA, total, tasa y notas. */
export function renderTotals(invoice: Invoice): void {
  elements.subtotalText.innerHTML = formatDualSnapshot(invoice.subtotal_usd_cents, invoice.subtotal_bs_cents);
  elements.taxLabel.textContent = `IVA (${formatDecimalInput(invoice.tax_percent)} %)`;
  elements.taxText.innerHTML = formatDualSnapshot(invoice.tax_usd_cents, invoice.tax_bs_cents);
  elements.totalUsdText.textContent = formatUsd(invoice.total_usd_cents);
  elements.totalBsText.textContent = formatBs(invoice.total_bs_cents);
  elements.rateText.textContent = `Bs ${formatRate(invoice.rate)} por $`;
  setOptionalLine(elements.notesText, invoice.notes ? `Notas: ${invoice.notes}` : "");
}
