import { formatDateTime, formatTime } from "../../format";
import { type InvoiceSummary, invoiceNumberLabel, invoiceStatusBadge } from "../../invoices";
import { tableCell as cell, textElement } from "../../list";
import { formatDualSnapshot } from "../../money";
import { elements } from "./elements";

function invoiceNumberCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("text-nowrap");
  const link = textElement(
    "a",
    invoiceNumberLabel(invoice.number),
    "fw-semibold text-decoration-none invoice-number",
  ) as HTMLAnchorElement;
  link.href = `/facturas/${invoice.id}`;
  td.append(link, textElement("div", formatTime(invoice.created_at), "small text-body-secondary d-md-none"));
  const badge = invoiceStatusBadge(invoice.status);
  badge.classList.add("d-sm-none", "mt-1");
  td.append(badge);
  return td;
}

function invoiceCustomerCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("invoice-customer-cell");
  if (invoice.customer === null) {
    td.append(textElement("div", "Consumidor final", "fst-italic text-body-secondary"));
    return td;
  }
  td.append(
    textElement("div", invoice.customer.name),
    textElement("div", invoice.customer.document, "small text-body-secondary"),
  );
  return td;
}

function invoiceRow(invoice: InvoiceSummary): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.className = `invoice-row${invoice.status === "void" ? " invoice-row-void" : ""}`;
  tr.dataset.href = `/facturas/${invoice.id}`;
  const date = cell("d-none d-md-table-cell text-nowrap small");
  date.textContent = formatDateTime(invoice.created_at);
  const total = cell("amount-cell");
  total.innerHTML = formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents);
  const status = cell("d-none d-sm-table-cell");
  status.append(invoiceStatusBadge(invoice.status));
  tr.append(invoiceNumberCell(invoice), date, invoiceCustomerCell(invoice), total, status);
  return tr;
}

export function renderInvoices(invoices: readonly InvoiceSummary[]): void {
  elements.invoicesEmpty.classList.toggle("d-none", invoices.length > 0);
  elements.invoicesTable.classList.toggle("d-none", invoices.length === 0);
  elements.invoicesBody.replaceChildren(...invoices.map(invoiceRow));
}

export function onInvoiceRowClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest("a, button")) return;
  const row = target.closest<HTMLTableRowElement>("tr[data-href]");
  if (row?.dataset.href) window.location.href = row.dataset.href;
}
