import { type Invoice, invoiceNumberLabel, PAYMENT_TYPE_LABELS } from "../../invoices";
import { textElement } from "../../list";
import { formatDualSnapshot } from "../../money";
import { modalElements } from "./modal-elements";
import { state } from "./state";

const el = modalElements;

export function showReviewChanges(changes: readonly string[]): void {
  el.reviewChanges.classList.toggle("d-none", changes.length === 0);
  if (changes.length === 0) {
    el.reviewChanges.replaceChildren();
    return;
  }
  const list = document.createElement("ul");
  list.className = "mb-1 ps-3";
  list.append(...changes.map((change) => textElement("li", change)));
  el.reviewChanges.replaceChildren(
    textElement("strong", "Cambiaron datos de la venta:", "d-block mb-1"),
    list,
    "Revisa el nuevo total antes de registrar.",
  );
}

export function showReviewMode(): void {
  state.saleDone = false;
  el.saleModalTitle.textContent = "Confirmar venta";
  el.reviewView.classList.remove("d-none");
  el.reviewActions.classList.remove("d-none");
  el.doneView.classList.add("d-none");
  el.doneActions.classList.add("d-none");
  el.reviewError.classList.add("d-none");
  el.reviewError.textContent = "";
  showReviewChanges([]);
}

function describeSale(invoice: Invoice): string {
  const customer = invoice.customer
    ? `${invoice.customer.first_name} ${invoice.customer.last_name}`.trim()
    : "Consumidor final";
  return `${PAYMENT_TYPE_LABELS[invoice.payment_type]} · ${customer}`;
}

export function showDone(invoice: Invoice, note: string | null): void {
  state.saleDone = true;
  el.saleModalTitle.textContent = "Venta registrada";
  el.doneTitle.textContent = `Factura ${invoiceNumberLabel(invoice.number)}`;
  el.doneText.textContent = describeSale(invoice);
  el.doneTotal.innerHTML = `Total: <strong>${formatDualSnapshot(invoice.total_usd_cents, invoice.total_bs_cents)}</strong>`;
  el.doneExtra.textContent = note ?? "";
  el.doneExtra.classList.toggle("d-none", note === null);
  el.reviewView.classList.add("d-none");
  el.reviewActions.classList.add("d-none");
  el.doneView.classList.remove("d-none");
  el.doneActions.classList.remove("d-none");
  el.newSaleButton.focus();
}
