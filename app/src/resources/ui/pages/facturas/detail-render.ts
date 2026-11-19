import { formatRate } from "../../format";
import { type Invoice, PAYMENT_TYPE_LABELS } from "../../invoices";
import { textElement } from "../../list";
import { detailElements as e } from "./detail-elements";
import { renderCustomer, renderVoidNotice, setTitle } from "./detail-header";
import { itemRow, renderTotals } from "./detail-items";
import { renderPayments } from "./detail-payments";

/** Pinta todo el detalle de la factura en el modal. */
export function renderInvoice(current: Invoice): void {
  setTitle(current, current.id);
  renderVoidNotice(current);
  renderCustomer(current);
  e.paymentTypeText.textContent = PAYMENT_TYPE_LABELS[current.payment_type];
  e.rateText.textContent = `Bs ${formatRate(current.rate)} por $`;
  e.notesText.classList.toggle("d-none", !current.notes);
  e.notesText.replaceChildren(textElement("span", "Notas: ", "text-body-secondary"), current.notes ?? "");
  e.itemsBody.replaceChildren(...current.items.map(itemRow));
  renderTotals(current);
  renderPayments(current);
  e.modalElement.classList.toggle("invoice-is-void", current.status === "void");
  e.voidButton.classList.toggle("d-none", current.status === "void");
  e.payButton.classList.toggle("d-none", current.status !== "pending");
}
