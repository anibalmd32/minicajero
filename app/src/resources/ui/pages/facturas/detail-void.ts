import { ApiError } from "../../api";
import { clearFieldErrors } from "../../form";
import { formatInteger } from "../../format";
import { type Invoice, invoiceNumberLabel, voidInvoice } from "../../invoices";
import { formatDualSnapshot } from "../../money";
import { showToast, toastError, toastSuccess } from "../../toast";
import { detailElements as e } from "./detail-elements";
import { load } from "./detail-load";
import { renderInvoice } from "./detail-render";
import { detailState, showView } from "./detail-state";

function unitsText(current: Invoice): string {
  const units = current.items.reduce((sum, item) => sum + item.quantity, 0);
  const products = current.items.length === 1 ? "1 producto" : `${formatInteger(current.items.length)} productos`;
  const unitsLabel = units === 1 ? "1 unidad" : `${formatInteger(units)} unidades`;
  return `Se devolverán al inventario ${unitsLabel} (${products}).`;
}

function paymentsWarning(current: Invoice): string {
  const paid = formatDualSnapshot(current.payments_usd_cents, current.payments_bs_cents);
  return (
    `Esta factura tiene abonos por ${paid}. ` +
    "Quedan registrados y no se reintegran solos: devuélvelos al cliente si corresponde."
  );
}

/** Abre el formulario de anulación de la factura abierta. */
export function startVoid(): void {
  const { invoice } = detailState;
  if (!invoice || invoice.status === "void") return;
  e.voidForm.reset();
  clearFieldErrors(e.voidForm);
  e.voidNumber.textContent = invoiceNumberLabel(invoice.number);
  e.voidTotal.innerHTML = formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents);
  e.voidStock.textContent = unitsText(invoice);
  const hasPayments = invoice.payments_usd_cents > 0;
  e.voidPayments.classList.toggle("d-none", !hasPayments);
  e.voidPayments.innerHTML = hasPayments ? paymentsWarning(invoice) : "";
  showView("void");
  e.voidReason.focus();
}

/** Vuelve al detalle sin anular. */
export function cancelVoid(): void {
  showView("detail");
  e.voidButton.focus();
}

/** Anula la factura con el motivo del formulario. */
export async function submitVoid(values: Record<string, string>): Promise<void> {
  const current = detailState.invoice;
  if (!current) return;
  const request = detailState.session;
  try {
    const voided = await voidInvoice(current.id, values.reason ?? "");
    detailState.hooks.onChanged();
    if (request !== detailState.session) return;
    detailState.invoice = voided;
    renderInvoice(voided);
    showView("detail");
    e.printButton.focus();
    toastSuccess(`Factura ${invoiceNumberLabel(voided.number)} anulada. El stock se devolvió al inventario.`);
    if (voided.warning) showToast(voided.warning, "warning");
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 409)) throw err;
    toastError(err.message);
    detailState.hooks.onChanged();
    if (request === detailState.session) await load(current.id);
  }
}
