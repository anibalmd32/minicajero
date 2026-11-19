import { errorMessage } from "../../api";
import { confirmAction } from "../../confirm";
import { withBusyButton } from "../../form";
import { formatDateTime } from "../../format";
import { type Invoice, type InvoicePayment, invoiceNumberLabel } from "../../invoices";
import { dualAmountTexts } from "../../money";
import { currentAmountText } from "../../payment-feedback";
import { revertPayment } from "../../payments";
import { toastError, toastSuccess } from "../../toast";
import { detailElements as e } from "./detail-elements";
import { load } from "./detail-load";
import { renderInvoice } from "./detail-render";
import { detailState } from "./detail-state";

function confirmRevert(current: Invoice, payment: InvoicePayment, amount: string): Promise<boolean> {
  return confirmAction({
    title: "Revertir abono",
    message: `¿Revertir el abono de ${amount} del ${formatDateTime(payment.created_at)}? Se eliminará y el monto volverá a sumar al saldo de la factura ${invoiceNumberLabel(current.number)}.`,
    confirmText: "Revertir abono",
    variant: "danger",
  });
}

async function revert(button: HTMLButtonElement): Promise<void> {
  const current = detailState.invoice;
  const paymentId = Number(button.dataset.paymentId);
  const payment = current?.payments.find((item) => item.id === paymentId);
  if (!current || !payment) return;
  const amount = dualAmountTexts(payment.amount_usd_cents, payment.amount_bs_cents).primary;
  if (!(await confirmRevert(current, payment, amount)) || !button.isConnected) return;
  const request = detailState.session;
  try {
    const updated = await withBusyButton(button, () => revertPayment(paymentId), "Revirtiendo…");
    detailState.hooks.onChanged();
    if (request !== detailState.session) return;
    detailState.invoice = updated;
    renderInvoice(updated);
    toastSuccess(`Abono de ${amount} revertido. Saldo pendiente: ${currentAmountText(updated.balance_usd_cents)}.`);
    e.payButton.focus();
  } catch (err) {
    toastError(`No se pudo revertir el abono. ${errorMessage(err)}`);
    if (request === detailState.session) await load(current.id);
  }
}

/** Clic en la lista de abonos: revierte el abono del botón pulsado. */
export function onPaymentsClick(event: MouseEvent): void {
  const button =
    event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-payment-id]") : null;
  if (button) void revert(button);
}
