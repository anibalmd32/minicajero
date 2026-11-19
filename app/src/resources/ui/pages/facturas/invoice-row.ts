import { formatDate, formatTime } from "../../format";
import { type InvoiceSummary, invoiceNumberLabel, invoiceStatusBadge, PAYMENT_TYPE_LABELS } from "../../invoices";
import { tableCell as cell, textElement } from "../../list";
import { formatDual, formatDualSnapshot } from "../../money";

function numberCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("text-nowrap");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-link p-0 fw-semibold text-decoration-none invoice-number";
  button.dataset.action = "view";
  button.dataset.id = String(invoice.id);
  button.textContent = invoiceNumberLabel(invoice.number);
  button.setAttribute("aria-label", `Ver factura ${invoiceNumberLabel(invoice.number)}`);
  td.append(button, textElement("div", formatDate(invoice.created_at), "small text-body-secondary d-md-none"));
  return td;
}

function dateCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("d-none d-md-table-cell text-nowrap");
  td.append(
    textElement("div", formatDate(invoice.created_at)),
    textElement("div", formatTime(invoice.created_at), "small text-body-secondary"),
  );
  return td;
}

function customerMeta(invoice: InvoiceSummary): HTMLElement {
  const meta = document.createElement("div");
  meta.className = "small text-body-secondary invoice-meta-inline";
  if (invoice.customer) meta.append(textElement("span", invoice.customer.document, "text-nowrap"));
  meta.append(textElement("span", PAYMENT_TYPE_LABELS[invoice.payment_type], "d-lg-none"));
  const badge = invoiceStatusBadge(invoice.status);
  badge.classList.add("d-sm-none");
  meta.append(badge);
  return meta;
}

function customerCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("invoice-customer-cell");
  const customer = invoice.customer;
  td.append(
    customer
      ? textElement("div", customer.name, "fw-semibold text-break")
      : textElement("div", "Consumidor final", "fst-italic text-body-secondary"),
    customerMeta(invoice),
  );
  return td;
}

function totalCell(invoice: InvoiceSummary): HTMLTableCellElement {
  const td = cell("amount-cell");
  const total = document.createElement("div");
  total.className = invoice.status === "void" ? "text-decoration-line-through text-body-secondary" : "fw-semibold";
  total.innerHTML = formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents);
  td.append(total);
  if (invoice.status === "pending") {
    const balance = document.createElement("div");
    balance.className = "small text-danger invoice-balance";
    balance.innerHTML = `Debe ${formatDual(invoice.balance_usd_cents)}`;
    td.append(balance);
  }
  return td;
}

/** Fila del listado de facturas. */
export function invoiceRow(invoice: InvoiceSummary): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "invoice-row";
  row.dataset.id = String(invoice.id);
  if (invoice.status === "void") row.classList.add("invoice-row-void");
  const paymentCell = cell("d-none d-lg-table-cell");
  paymentCell.textContent = PAYMENT_TYPE_LABELS[invoice.payment_type];
  const statusCell = cell("d-none d-sm-table-cell");
  statusCell.append(invoiceStatusBadge(invoice.status));
  row.append(
    numberCell(invoice),
    dateCell(invoice),
    customerCell(invoice),
    paymentCell,
    statusCell,
    totalCell(invoice),
  );
  return row;
}
