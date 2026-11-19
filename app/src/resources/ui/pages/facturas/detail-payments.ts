import { formatDateTime, formatRate } from "../../format";
import type { Invoice, InvoicePayment } from "../../invoices";
import { textElement } from "../../list";
import { formatDual, formatDualSnapshot } from "../../money";
import { paymentCurrencyLabel } from "../../payments";
import { detailElements as e } from "./detail-elements";

function revertButton(payment: InvoicePayment): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-link btn-sm p-0 link-danger text-decoration-none";
  button.dataset.paymentId = String(payment.id);
  button.textContent = "Revertir";
  button.setAttribute("aria-label", `Revertir el abono del ${formatDateTime(payment.created_at)}`);
  return button;
}

function paymentInfo(payment: InvoicePayment): HTMLElement {
  const info = document.createElement("div");
  info.className = "min-w-0";
  info.append(textElement("div", formatDateTime(payment.created_at), "small"));
  const meta = `Recibido en ${paymentCurrencyLabel(payment.currency)} · Tasa Bs ${formatRate(payment.rate)}`;
  info.append(textElement("div", meta, "small text-body-secondary"));
  if (payment.notes) info.append(textElement("div", payment.notes, "small text-body-secondary text-break"));
  return info;
}

function paymentItem(payment: InvoicePayment, canRevert: boolean): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "list-group-item px-0 d-flex flex-wrap justify-content-between gap-1";
  const amount = document.createElement("div");
  amount.className = "text-end amount-cell ms-auto";
  amount.innerHTML = formatDualSnapshot(payment.amount_usd_cents, payment.amount_bs_cents);
  if (canRevert) amount.append(revertButton(payment));
  li.append(paymentInfo(payment), amount);
  return li;
}

function renderBalance(current: Invoice): void {
  const balanceRow = e.balanceText.closest(".pos-totals-row");
  balanceRow?.classList.toggle("d-none", current.status === "void");
  e.balanceText.innerHTML = formatDual(current.balance_usd_cents);
  e.balanceText.classList.toggle("text-danger", current.balance_usd_cents > 0);
  e.balanceNote.classList.toggle("d-none", current.status === "void");
  e.balanceNote.textContent =
    current.balance_usd_cents > 0
      ? "La deuda se lleva en dólares; los Bs se calculan con la tasa actual."
      : "Factura pagada por completo.";
}

/** Abonos, total pagado y saldo de una factura fiada. */
export function renderPayments(current: Invoice): void {
  const isCredit = current.payment_type === "credit";
  e.paymentsSection.classList.toggle("d-none", !isCredit);
  if (!isCredit) return;
  e.paymentsEmpty.classList.toggle("d-none", current.payments.length > 0);
  const canRevert = current.status !== "void";
  e.paymentsList.replaceChildren(...current.payments.map((payment) => paymentItem(payment, canRevert)));
  e.paidText.innerHTML = formatDualSnapshot(current.payments_usd_cents, current.payments_bs_cents);
  renderBalance(current);
}
