import { ApiError } from "../../api";
import { customerFullName } from "../../customers";
import { clearFieldErrors, type FormValues } from "../../form";
import { formatInteger } from "../../format";
import { invoiceNumberLabel } from "../../invoices";
import { dualAmountTexts } from "../../money";
import { currentAmountText, refreshRateAfterConflict } from "../../payment-feedback";
import { type CustomerPaymentResult, payCustomer } from "../../payments";
import { toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";
import { currentStatement, customerId, load } from "./statement-load";

const { paymentForm, paymentModal } = elements;

function pendingInvoicesLabel(count: number): string {
  return count === 1 ? "1 factura pendiente" : `${formatInteger(count)} facturas pendientes`;
}

/** Abre el modal de abono con el saldo actual del cliente. */
export function openPayment(): void {
  const statement = currentStatement();
  if (!statement || statement.summary.balance_usd_cents <= 0) return;
  clearFieldErrors(paymentForm.form);
  const { customer, summary } = statement;
  const context = `${customerFullName(customer)} · ${pendingInvoicesLabel(summary.pending_invoices)}`;
  paymentForm.open(summary.balance_usd_cents, context);
  paymentModal.show();
}

function invoiceLabels(result: CustomerPaymentResult, settled: boolean): string[] {
  return result.payments
    .filter((payment) => payment.invoice_settled === settled)
    .map((payment) => invoiceNumberLabel(payment.invoice_number));
}

function paymentSummary(result: CustomerPaymentResult): string {
  const amount = dualAmountTexts(result.amount_usd_cents, result.amount_bs_cents).primary;
  const settled = invoiceLabels(result, true);
  const partial = invoiceLabels(result, false);
  const parts = [`Abono de ${amount} registrado.`];
  if (settled.length > 0) {
    const verb = settled.length === 1 ? "Quedó pagada la factura" : "Quedaron pagadas las facturas";
    parts.push(`${verb} ${settled.join(", ")}.`);
  }
  if (partial.length > 0) parts.push(`Abono parcial a la factura ${partial.join(", ")}.`);
  const balance = result.customer.balance_usd_cents;
  parts.push(balance > 0 ? `Saldo pendiente: ${currentAmountText(balance)}.` : "El cliente quedó al día.");
  return parts.join(" ");
}

/** Registra el abono global; ante un conflicto del servidor cierra el modal y recarga. */
export async function submitPayment(values: FormValues): Promise<void> {
  if (customerId === null) return;
  try {
    const result = await payCustomer(customerId, paymentForm.input(values));
    paymentModal.hide();
    toastSuccess(paymentSummary(result));
    await load();
  } catch (err) {
    await refreshRateAfterConflict(err, paymentForm.refresh);
    if (err instanceof ApiError && err.status === 409 && !err.hasFieldErrors) {
      paymentModal.hide();
      toastError(err.message);
      await load();
      return;
    }
    throw err;
  }
}
