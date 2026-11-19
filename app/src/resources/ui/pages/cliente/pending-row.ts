import { formatDate } from "../../format";
import { tableCell as cell, textElement } from "../../list";
import { formatDual, formatDualSnapshot } from "../../money";
import type { PendingInvoice } from "../../payments";
import { invoiceLink } from "./invoice-link";

function nameCell(invoice: PendingInvoice): HTMLTableCellElement {
  const name = cell("min-w-0");
  name.append(
    invoiceLink(invoice.id, invoice.number),
    textElement("div", formatDate(invoice.created_at), "small text-body-secondary"),
  );
  const paidInline = document.createElement("div");
  paidInline.className = "small text-body-secondary d-md-none amount-cell";
  paidInline.innerHTML = `Total ${formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents)}`;
  name.append(paidInline);
  return name;
}

/** Fila de la tabla de facturas pendientes. */
export function pendingRow(invoice: PendingInvoice): HTMLTableRowElement {
  const row = document.createElement("tr");
  const total = cell("amount-cell d-none d-md-table-cell");
  total.innerHTML = formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents);
  const paid = cell("amount-cell d-none d-md-table-cell");
  paid.innerHTML =
    invoice.payments_usd_cents > 0 ? formatDualSnapshot(invoice.payments_usd_cents, invoice.payments_bs_cents) : "—";
  const balance = cell("amount-cell text-danger fw-semibold");
  balance.innerHTML = formatDual(invoice.balance_usd_cents);
  row.append(nameCell(invoice), total, paid, balance);
  return row;
}
