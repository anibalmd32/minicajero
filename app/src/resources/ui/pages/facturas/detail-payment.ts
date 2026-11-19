import { ApiError } from "../../api";
import { customerFullName } from "../../customers";
import { clearFieldErrors, type FormValues } from "../../form";
import { type Invoice, invoiceNumberLabel } from "../../invoices";
import { dualAmountTexts } from "../../money";
import { currentAmountText, refreshRateAfterConflict } from "../../payment-feedback";
import { payInvoice } from "../../payments";
import { toastError, toastSuccess } from "../../toast";
import { detailElements as e } from "./detail-elements";
import { load } from "./detail-load";
import { renderInvoice } from "./detail-render";
import { detailState, showView } from "./detail-state";

function paymentContext(current: Invoice): string {
  const customer = current.customer ? ` · ${customerFullName(current.customer)}` : "";
  return `Factura ${invoiceNumberLabel(current.number)}${customer}`;
}

function paymentToast(updated: Invoice, usdCents: number, bsCents: number): string {
  const amount = dualAmountTexts(usdCents, bsCents);
  const label = invoiceNumberLabel(updated.number);
  if (updated.status === "paid") return `Abono de ${amount.primary} registrado. La factura ${label} quedó pagada.`;
  const balance = currentAmountText(updated.balance_usd_cents);
  return `Abono de ${amount.primary} registrado a la factura ${label}. Saldo pendiente: ${balance}.`;
}

/** Abre el formulario de abono de la factura pendiente abierta. */
export function startPayment(): void {
  const { invoice } = detailState;
  if (invoice?.status !== "pending") return;
  clearFieldErrors(e.paymentForm.form);
  e.paymentForm.open(invoice.balance_usd_cents, paymentContext(invoice));
  showView("payment");
  e.paymentForm.focusAmount();
}

/** Vuelve al detalle sin abonar. */
export function cancelPayment(): void {
  showView("detail");
  e.payButton.focus();
}

function isRecoverableConflict(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.status === 404 || (err.status === 409 && !err.hasFieldErrors));
}

/** Registra el abono del formulario; ante un conflicto del servidor recarga la factura. */
export async function submitPayment(values: FormValues): Promise<void> {
  const current = detailState.invoice;
  if (!current) return;
  const request = detailState.session;
  try {
    const result = await payInvoice(current.id, e.paymentForm.input(values));
    detailState.hooks.onChanged();
    if (request !== detailState.session) return;
    detailState.invoice = result.invoice;
    renderInvoice(result.invoice);
    showView("detail");
    (result.invoice.status === "pending" ? e.payButton : e.printButton).focus();
    toastSuccess(paymentToast(result.invoice, result.payment.amount_usd_cents, result.payment.amount_bs_cents));
  } catch (err) {
    await refreshRateAfterConflict(err, e.paymentForm.refresh);
    if (!isRecoverableConflict(err)) throw err;
    toastError(err.message);
    detailState.hooks.onChanged();
    if (request === detailState.session) await load(current.id);
  }
}
