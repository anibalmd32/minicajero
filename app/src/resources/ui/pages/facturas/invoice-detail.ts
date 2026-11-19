import { bindForm } from "../../form";
import { invoicePrintUrl } from "../../invoices";
import { formatDualSnapshot } from "../../money";
import { detailElements as e } from "./detail-elements";
import { load } from "./detail-load";
import { cancelPayment, startPayment, submitPayment } from "./detail-payment";
import { renderInvoice } from "./detail-render";
import { onPaymentsClick } from "./detail-revert";
import { detailState, type InvoiceDetailController, type InvoiceDetailHooks } from "./detail-state";
import { cancelVoid, startVoid, submitVoid } from "./detail-void";

export type { InvoiceDetailController, InvoiceDetailHooks } from "./detail-state";

function print(): void {
  if (detailState.invoice) window.location.assign(invoicePrintUrl(detailState.invoice.id, true));
}

function bindActions(): void {
  e.retryButton.addEventListener("click", () => {
    if (detailState.invoiceId !== null) void load(detailState.invoiceId);
  });
  e.voidButton.addEventListener("click", startVoid);
  e.voidCancel.addEventListener("click", cancelVoid);
  e.printButton.addEventListener("click", print);
  e.payButton.addEventListener("click", startPayment);
  e.paymentCancel.addEventListener("click", cancelPayment);
  e.paymentsList.addEventListener("click", onPaymentsClick);
  bindForm(e.voidForm, submitVoid);
  bindForm(e.paymentForm.form, submitPayment);
}

function bindModalLifecycle(): void {
  e.modalElement.addEventListener("shown.bs.modal", () => {
    if (!e.detail.classList.contains("d-none")) e.printButton.focus();
  });
  e.modalElement.addEventListener("hidden.bs.modal", () => {
    detailState.session += 1;
    detailState.invoiceId = null;
    detailState.invoice = null;
    detailState.hooks.onClosed();
  });
}

function rerender(): void {
  const { invoice } = detailState;
  if (invoice) renderInvoice(invoice);
  if (!e.voidForm.classList.contains("d-none") && invoice) {
    e.voidTotal.innerHTML = formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents);
  }
  e.paymentForm.refresh();
}

function open(id: number): void {
  detailState.invoiceId = id;
  e.modal.show();
  void load(id);
}

/** Conecta el modal de detalle (una sola vez por página) y devuelve cómo abrirlo. */
export function setupInvoiceDetail(detailHooks: InvoiceDetailHooks): InvoiceDetailController {
  detailState.hooks = detailHooks;
  bindActions();
  bindModalLifecycle();
  return { open, rerender };
}
