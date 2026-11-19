import { formatBs, formatUsd } from "../../format";
import type { Invoice } from "../../invoices";
import { formatDualSnapshot, getCurrentRate, usdCentsToBs } from "../../money";
import { elements } from "./elements";

function balanceBsCents(invoice: Invoice): number | null {
  const unchangedSinceSale = invoice.payments_usd_cents === 0 && getCurrentRate() === invoice.rate;
  return unchangedSinceSale ? invoice.total_bs_cents : usdCentsToBs(invoice.balance_usd_cents);
}

function balanceHtml(invoice: Invoice): string {
  const bsCents = balanceBsCents(invoice);
  const bs = bsCents === null ? "" : `<small>(${formatBs(bsCents)} a la tasa de hoy)</small>`;
  return `<span>${formatUsd(invoice.balance_usd_cents)}</span>${bs}`;
}

/** Pinta lo abonado y el saldo de una factura fiada no anulada. */
export function renderCredit(invoice: Invoice): void {
  const showBalance = invoice.payment_type === "credit" && invoice.status !== "void";
  elements.creditSection.classList.toggle("d-none", !showBalance);
  elements.balanceNote.classList.toggle("d-none", !showBalance || invoice.balance_usd_cents <= 0);
  if (!showBalance) return;
  elements.paidText.innerHTML = formatDualSnapshot(invoice.payments_usd_cents, invoice.payments_bs_cents);
  elements.balanceText.innerHTML = invoice.balance_usd_cents > 0 ? balanceHtml(invoice) : "<span>Pagada</span>";
  elements.balanceNote.textContent =
    "La deuda se lleva en dólares; su equivalente en bolívares se calcula con la tasa del día del pago.";
}
