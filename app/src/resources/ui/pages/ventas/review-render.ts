import { formatInteger } from "../../format";
import { PAYMENT_TYPE_LABELS } from "../../invoices";
import { textElement } from "../../list";
import { dualAmountTexts, formatDual } from "../../money";
import { type CartLine, type CartTotals, lineTotalUsd } from "../../sale-cart";
import { dualHtml } from "./amounts";
import { renderChange } from "./change";
import { modalElements } from "./modal-elements";
import { renderRate, renderTaxRow } from "./rate-render";
import { currentTotals, isCredit } from "./sale-totals";
import { state } from "./state";

const el = modalElements;
const SECONDARY_NOTE = "d-block small fw-normal text-body-secondary";

function reviewLine(line: CartLine): HTMLTableRowElement {
  const row = document.createElement("tr");
  const name = document.createElement("td");
  name.append(textElement("div", line.name, "text-break"));
  const unit = document.createElement("div");
  unit.className = "small text-body-secondary";
  unit.innerHTML = `${formatDual(line.price_usd_cents)} c/u`;
  name.append(unit);
  const quantity = textElement("td", formatInteger(line.quantity), "text-center") as HTMLTableCellElement;
  const total = document.createElement("td");
  total.className = "amount-cell";
  total.innerHTML = formatDual(lineTotalUsd(line));
  row.append(name, quantity, total);
  return row;
}

function itemsSummaryText(): string {
  const count = state.cart.lines.length;
  return count === 1 ? "Ver el producto" : `Ver los ${formatInteger(count)} productos`;
}

function renderReviewDebt(totals: CartTotals): void {
  const customer = state.cart.customer;
  const visible = isCredit() && customer !== null;
  el.reviewDebt.classList.toggle("d-none", !visible);
  if (!visible) return;
  el.reviewDebtBefore.innerHTML = formatDual(customer.balance_usd_cents);
  el.reviewDebtAfter.innerHTML = formatDual(customer.balance_usd_cents + totals.total_usd_cents);
}

export function renderSubmitButton(): void {
  const totals = currentTotals();
  const amount = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents).primary;
  el.submitButton.textContent = isCredit() ? `Anotar fiado ${amount}` : `Cobrar ${amount}`;
  el.submitButton.classList.toggle("btn-accent", !isCredit());
  el.submitButton.classList.toggle("btn-danger", isCredit());
}

function renderReviewParties(): void {
  const { customer, payment_type } = state.cart;
  el.reviewCustomer.replaceChildren(customer?.name ?? "Consumidor final");
  if (customer) el.reviewCustomer.append(textElement("span", customer.document, SECONDARY_NOTE));
  el.reviewPayment.replaceChildren(PAYMENT_TYPE_LABELS[payment_type]);
  if (isCredit()) el.reviewPayment.append(textElement("span", "Queda pendiente en su cuenta", SECONDARY_NOTE));
}

function renderReviewTotal(totals: CartTotals): void {
  el.reviewTotalLabel.textContent = isCredit() ? "Total fiado" : "Total a cobrar";
  const amounts = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents);
  el.reviewTotalPrimary.textContent = amounts.primary;
  el.reviewTotalSecondary.textContent = `(${amounts.secondary})`;
  renderRate(el.reviewRate);
}

export function renderReview(): void {
  const totals = currentTotals();
  renderReviewTotal(totals);
  renderReviewParties();
  renderReviewDebt(totals);
  el.changeForm.classList.toggle("d-none", isCredit());
  renderChange();
  el.reviewItemsSummary.textContent = itemsSummaryText();
  el.reviewLines.replaceChildren(...state.cart.lines.map(reviewLine));
  el.reviewSubtotal.innerHTML = dualHtml(totals.subtotal_usd_cents, totals.subtotal_bs_cents);
  renderTaxRow(el.reviewTaxRow, el.reviewTaxLabel, el.reviewTax, totals);
  renderSubmitButton();
}
