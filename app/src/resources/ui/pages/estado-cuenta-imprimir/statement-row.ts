import { formatDate, formatDateTime, formatRate } from "../../format";
import { invoiceNumberLabel } from "../../invoices";
import { textElement } from "../../list";
import { dualAmountTexts, formatDual, formatDualSnapshot } from "../../money";
import { paymentCurrencyLabel, type StatementEntry } from "../../payments";

function entryConcept(entry: StatementEntry): string {
  const invoice = `factura ${invoiceNumberLabel(entry.invoice_number)}`;
  if (entry.kind === "payment") {
    return `Abono a ${invoice} (en ${paymentCurrencyLabel(entry.currency ?? "USD")}, tasa Bs ${formatRate(entry.rate)})`;
  }
  const label = `Factura ${invoiceNumberLabel(entry.invoice_number)}`;
  if (entry.invoice_status === "void") return `${label} · anulada, no suma al saldo`;
  return `${label} · ${entry.payment_type === "cash" ? "contado" : "fiado"}`;
}

function moneyCell(usdCents: number, bsCents: number, className: string): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = className;
  td.innerHTML = usdCents > 0 ? formatDualSnapshot(usdCents, bsCents) : "—";
  return td;
}

function dualAmountText(usdCents: number, bsCents: number): string {
  const { primary, secondary } = dualAmountTexts(usdCents, bsCents);
  return `${primary} (${secondary})`;
}

function inlineMovement(entry: StatementEntry): HTMLElement {
  const inline = document.createElement("span");
  inline.className = "sheet-item-unit";
  const parts: string[] = [];
  if (entry.charge_usd_cents > 0) parts.push(`Cargo ${dualAmountText(entry.charge_usd_cents, entry.charge_bs_cents)}`);
  if (entry.credit_usd_cents > 0) parts.push(`Abono ${dualAmountText(entry.credit_usd_cents, entry.credit_bs_cents)}`);
  inline.textContent = `${formatDate(entry.date)} · ${parts.join(" · ")}`;
  return inline;
}

function conceptCell(entry: StatementEntry): HTMLTableCellElement {
  const concept = document.createElement("td");
  concept.className = "col-desc";
  concept.append(textElement("span", entryConcept(entry), "sheet-item-name"));
  if (entry.notes) concept.append(textElement("span", entry.notes, "sheet-item-code"));
  concept.append(inlineMovement(entry));
  return concept;
}

/** Fila de la tabla de movimientos de la hoja. */
export function entryRow(entry: StatementEntry): HTMLTableRowElement {
  const row = document.createElement("tr");
  if (!entry.counts) row.className = "statement-row-void";
  const balance = document.createElement("td");
  balance.className = "col-balance";
  balance.innerHTML = formatDual(entry.balance_usd_cents);
  row.append(
    textElement("td", formatDateTime(entry.date), "col-date"),
    conceptCell(entry),
    moneyCell(entry.charge_usd_cents, entry.charge_bs_cents, "col-money"),
    moneyCell(entry.credit_usd_cents, entry.credit_bs_cents, "col-money"),
    balance,
  );
  return row;
}
