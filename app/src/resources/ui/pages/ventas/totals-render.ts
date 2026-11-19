import { formatInteger } from "../../format";
import { PAYMENT_TYPE_LABELS } from "../../invoices";
import { dualAmountTexts } from "../../money";
import { unitsLabel } from "../../products";
import type { CartTotals } from "../../sale-cart";
import { dualHtml } from "./amounts";
import { cartElements } from "./cart-elements";
import { hasFinePointer } from "./environment";
import { lineHasError } from "./line-state";
import { customerPicker } from "./picker-instance";
import { renderRate, renderTaxRow } from "./rate-render";
import { hideSaleAlert } from "./sale-alert";
import { blockingReason, currentTotals, isCredit } from "./sale-totals";
import { state } from "./state";

const el = cartElements;

function renderSummary(totals: CartTotals): void {
  const amounts = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents);
  el.summaryCount.textContent = totals.units === 0 ? "Carrito vacío" : `${unitsLabel(totals.units)} · Total`;
  el.summaryPrimary.textContent = amounts.primary;
  el.summarySecondary.textContent = `(${amounts.secondary})`;
  el.summaryCart.textContent = totals.units === 0 ? "Carrito" : `Carrito (${formatInteger(totals.units)})`;
  el.summaryCharge.disabled = state.cart.lines.length === 0;
  el.summaryCharge.textContent = isCredit() ? "Fiar" : "Cobrar";
}

function chargeLabel(totals: CartTotals): string {
  const verb = isCredit() ? "Anotar fiado" : "Cobrar";
  if (state.cart.lines.length === 0) return verb;
  return `${verb} ${dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents).primary}`;
}

function confirmHintText(reason: string | null): string {
  if (reason !== null) return reason;
  return hasFinePointer()
    ? "Revisarás el resumen antes de registrar. Atajo: F4."
    : "Revisarás el resumen antes de registrar la venta.";
}

function renderConfirmButton(totals: CartTotals): void {
  const reason = blockingReason();
  el.confirmButton.disabled = reason !== null;
  if (!el.confirmButton.hasAttribute("aria-busy")) el.confirmButton.textContent = chargeLabel(totals);
  el.confirmHint.textContent = confirmHintText(reason);
  el.confirmHint.classList.toggle("text-danger", reason !== null && state.cart.lines.length > 0);
}

function renderAmounts(totals: CartTotals): void {
  el.subtotalText.innerHTML = dualHtml(totals.subtotal_usd_cents, totals.subtotal_bs_cents);
  renderTaxRow(el.taxRow, el.taxLabel, el.taxText, totals);
  const amounts = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents);
  el.totalPrimary.textContent = amounts.primary;
  el.totalSecondary.textContent = `(${amounts.secondary})`;
  renderRate(el.rateUsed);
  el.cartCount.textContent = totals.units > 0 ? formatInteger(totals.units) : "";
}

export function renderTotals(): void {
  const totals = currentTotals();
  renderAmounts(totals);
  if (!state.cart.lines.some(lineHasError)) hideSaleAlert();
  renderConfirmButton(totals);
  renderSummary(totals);
  const { customer, payment_type } = state.cart;
  customerPicker.render(customer, payment_type);
  el.checkoutWhoText.textContent = `${customer?.name ?? "Consumidor final"} · ${PAYMENT_TYPE_LABELS[payment_type]}`;
}
