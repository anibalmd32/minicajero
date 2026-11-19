import { setButtonBusy } from "../../form";
import { createInvoice, type Invoice, invoiceNumberLabel } from "../../invoices";
import { getCurrentRate, usdCentsToBs } from "../../money";
import { toSaleInput } from "../../sale-cart";
import { toastSuccess } from "../../toast";
import { amountText } from "./amounts";
import { resetSaleState } from "./cart-reset";
import { changeInReceivedCurrency, changeText, currentChange } from "./change";
import { modalElements } from "./modal-elements";
import { showDone } from "./review-mode";
import { renderSubmitButton } from "./review-render";
import { handleSaleError } from "./sale-errors";
import { currentQuery, runSearch } from "./search-request";
import { state } from "./state";

function saleDoneNote(invoice: Invoice): string | null {
  const { customer } = state.cart;
  if (invoice.payment_type === "credit" && customer) {
    const balance = customer.balance_usd_cents + invoice.total_usd_cents;
    return `Ahora debe ${amountText(balance, usdCentsToBs(balance))}`;
  }
  const change = currentChange();
  return change && changeInReceivedCurrency(change) > 0 ? changeText(change) : null;
}

function completeSale(invoice: Invoice): void {
  state.lastInvoice = invoice;
  const note = saleDoneNote(invoice);
  resetSaleState();
  void runSearch(currentQuery());
  showDone(invoice, note);
  toastSuccess(`Venta registrada: factura ${invoiceNumberLabel(invoice.number)}`);
}

async function requestInvoice(): Promise<Invoice | null> {
  const { submitButton } = modalElements;
  try {
    return await createInvoice(toSaleInput(state.cart, getCurrentRate(), state.ivaPercent ?? 0));
  } catch (err) {
    await handleSaleError(err);
    return null;
  } finally {
    setButtonBusy(submitButton, false);
  }
}

export async function submitSale(): Promise<void> {
  const { submitButton, reviewError, saleModalElement } = modalElements;
  if (submitButton.disabled) return;
  reviewError.classList.add("d-none");
  setButtonBusy(submitButton, true, "Registrando…");
  const invoice = await requestInvoice();
  if (invoice) {
    completeSale(invoice);
    return;
  }
  renderSubmitButton();
  if (saleModalElement.classList.contains("show")) submitButton.focus();
}
