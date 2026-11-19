import { customerFullName, formatPhone } from "../../customers";
import { formatBs, formatDate, formatRate, formatTime, formatUsd } from "../../format";
import { formatDual, formatDualSnapshot, getCurrentRate, usdCentsToBs } from "../../money";
import type { CustomerStatement } from "../../payments";
import { renderBusinessHeader, setOptionalLine } from "../../print-page";
import type { BusinessSettings } from "../../settings";
import { chrome, elements } from "./elements";
import { entryRow } from "./statement-row";

function renderCustomer(statement: CustomerStatement): void {
  const { customer, summary } = statement;
  elements.customerName.textContent = customerFullName(customer);
  elements.customerDocument.textContent = `Documento: ${customer.document}`;
  const phone = formatPhone(customer.phone);
  setOptionalLine(elements.customerPhone, phone ? `Teléfono: ${phone}` : "");
  elements.balanceHead.innerHTML = summary.balance_usd_cents > 0 ? formatDual(summary.balance_usd_cents) : "Al día";
}

function renderTotals(statement: CustomerStatement): void {
  const { summary } = statement;
  const rate = getCurrentRate();
  elements.rateText.textContent = rate === null ? "sin tasa" : `Bs ${formatRate(rate)} por $`;
  elements.creditTotal.innerHTML = formatDual(summary.credit_sales_usd_cents);
  elements.paidTotal.innerHTML = formatDualSnapshot(summary.payments_usd_cents, summary.payments_bs_cents);
  elements.balanceUsd.textContent = formatUsd(summary.balance_usd_cents);
  const bs = usdCentsToBs(summary.balance_usd_cents);
  elements.balanceBs.textContent = bs === null ? "Bs —" : formatBs(bs);
}

/** Pinta la hoja completa del estado de cuenta. */
export function renderStatement(statement: CustomerStatement, business: BusinessSettings | null): void {
  renderBusinessHeader(business);
  elements.dateText.textContent = formatDate(statement.generated_at);
  elements.timeText.textContent = formatTime(statement.generated_at);
  renderCustomer(statement);
  elements.entriesBody.replaceChildren(...statement.entries.map(entryRow));
  elements.emptyText.classList.toggle("d-none", statement.entries.length > 0);
  renderTotals(statement);
  const name = business?.business_name.trim();
  const fullName = customerFullName(statement.customer);
  chrome.toolbarTitle.textContent = `Estado de cuenta · ${fullName}`;
  document.title = `Estado de cuenta ${fullName}${name ? ` - ${name}` : ""}`;
}
