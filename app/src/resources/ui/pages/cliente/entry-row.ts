import { formatDateTime, formatRate } from "../../format";
import { invoiceStatusBadge } from "../../invoices";
import { tableCell as cell, textElement } from "../../list";
import { formatDual, formatDualSnapshot } from "../../money";
import { paymentCurrencyLabel, type StatementEntry } from "../../payments";
import { invoiceLink } from "./invoice-link";

function entryDetail(entry: StatementEntry): string {
  if (entry.kind === "payment") {
    return `Recibido en ${paymentCurrencyLabel(entry.currency ?? "USD")} · Tasa Bs ${formatRate(entry.rate)}`;
  }
  if (entry.invoice_status === "void") return "Anulada: no suma al saldo";
  return entry.payment_type === "cash" ? "Contado: pagada al vender" : "Fiado";
}

function conceptHeading(entry: StatementEntry): HTMLElement {
  const heading = document.createElement("div");
  heading.className = "d-flex flex-wrap align-items-center gap-2";
  if (entry.kind === "payment") {
    heading.append(textElement("span", "Abono a", "fw-semibold"), invoiceLink(entry.invoice_id, entry.invoice_number));
  } else {
    heading.append(invoiceLink(entry.invoice_id, entry.invoice_number));
    if (entry.invoice_status === "void") heading.append(invoiceStatusBadge("void"));
  }
  return heading;
}

function conceptCell(entry: StatementEntry): HTMLTableCellElement {
  const td = cell("min-w-0");
  td.append(
    conceptHeading(entry),
    textElement("div", formatDateTime(entry.date), "small text-body-secondary d-md-none"),
    textElement("div", entryDetail(entry), "small text-body-secondary"),
  );
  if (entry.notes) td.append(textElement("div", entry.notes, "small text-body-secondary text-break"));
  return td;
}

function moneyCell(usdCents: number, bsCents: number, className: string): HTMLTableCellElement {
  const td = cell(`amount-cell ${className}`);
  td.innerHTML = usdCents > 0 ? formatDualSnapshot(usdCents, bsCents) : "—";
  return td;
}

function compactMovementCell(entry: StatementEntry): HTMLTableCellElement {
  const td = cell("amount-cell d-sm-none");
  const lines: string[] = [];
  if (entry.charge_usd_cents > 0)
    lines.push(`<div>+ ${formatDualSnapshot(entry.charge_usd_cents, entry.charge_bs_cents)}</div>`);
  if (entry.credit_usd_cents > 0) {
    lines.push(
      `<div class="text-success">− ${formatDualSnapshot(entry.credit_usd_cents, entry.credit_bs_cents)}</div>`,
    );
  }
  td.innerHTML = lines.join("");
  return td;
}

/** Fila de la tabla de movimientos del estado de cuenta. */
export function entryRow(entry: StatementEntry): HTMLTableRowElement {
  const row = document.createElement("tr");
  if (!entry.counts) row.className = "statement-row-void";
  const date = cell("d-none d-md-table-cell text-nowrap small");
  date.textContent = formatDateTime(entry.date);
  const balance = cell("amount-cell fw-semibold");
  balance.innerHTML = formatDual(entry.balance_usd_cents);
  row.append(
    date,
    conceptCell(entry),
    moneyCell(entry.charge_usd_cents, entry.charge_bs_cents, "d-none d-sm-table-cell"),
    moneyCell(entry.credit_usd_cents, entry.credit_bs_cents, "d-none d-sm-table-cell text-success"),
    compactMovementCell(entry),
    balance,
  );
  return row;
}
