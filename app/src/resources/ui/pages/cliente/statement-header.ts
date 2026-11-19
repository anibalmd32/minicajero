import { customerFullName, formatPhone } from "../../customers";
import { formatDate, formatInteger } from "../../format";
import { textElement } from "../../list";
import { dualAmountTexts, formatDual, formatDualSnapshot, usdCentsToBs } from "../../money";
import { type CustomerStatement, customerStatementPrintUrl } from "../../payments";
import { elements } from "./elements";

/** Pinta el título, los enlaces y el botón de abonar según el saldo. */
export function renderHeader(current: CustomerStatement): void {
  const { customer } = current;
  elements.titleText.textContent = customerFullName(customer);
  const phone = formatPhone(customer.phone);
  elements.subtitleText.textContent = `Estado de cuenta · ${customer.document}${phone ? ` · ${phone}` : ""}`;
  elements.subtitleText.classList.remove("d-none");
  document.title = `Estado de cuenta de ${customerFullName(customer)} · MiniCajero`;
  elements.invoicesLink.href = `/facturas?cliente=${customer.id}`;
  elements.printLink.href = customerStatementPrintUrl(customer.id, true);
  elements.payButton.classList.toggle("d-none", current.summary.balance_usd_cents <= 0);
}

function renderBalance(current: CustomerStatement): void {
  const { summary } = current;
  const owes = summary.balance_usd_cents > 0;
  const balance = dualAmountTexts(summary.balance_usd_cents, usdCentsToBs(summary.balance_usd_cents));
  elements.balancePrimary.textContent = balance.primary;
  elements.balancePrimary.classList.toggle("text-danger", owes);
  elements.balanceSecondary.textContent = `(${balance.secondary})`;
  elements.balanceNote.textContent = owes ? "" : "Al día: no tiene deuda pendiente.";
  elements.balanceNote.classList.toggle("d-none", owes);
}

/** Pinta el saldo, las facturas pendientes y los totales. */
export function renderSummary(current: CustomerStatement): void {
  const { summary } = current;
  renderBalance(current);
  const count = summary.pending_invoices;
  elements.pendingCount.textContent = count === 0 ? "Ninguna" : formatInteger(count);
  if (summary.oldest_pending_at) {
    elements.pendingCount.append(
      textElement("small", ` desde el ${formatDate(summary.oldest_pending_at)}`, "d-block text-body-secondary"),
    );
  }
  elements.creditTotal.innerHTML = formatDual(summary.credit_sales_usd_cents);
  elements.paidTotal.innerHTML = formatDualSnapshot(summary.payments_usd_cents, summary.payments_bs_cents);
  elements.cashTotal.innerHTML = formatDual(summary.cash_sales_usd_cents);
}
