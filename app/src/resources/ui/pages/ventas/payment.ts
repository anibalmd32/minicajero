import type { PaymentType } from "../../invoices";
import type { CartCustomer } from "../../sale-cart";
import { cartElements } from "./cart-elements";
import { customerPicker } from "./picker-instance";
import { saveCart, state } from "./state";
import { renderTotals } from "./totals-render";

export function syncPaymentInputs(): void {
  for (const input of cartElements.paymentInputs) input.checked = input.value === state.cart.payment_type;
}

export function setPaymentType(paymentType: PaymentType): void {
  state.cart.payment_type = paymentType;
  syncPaymentInputs();
}

export function onPaymentChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.checked) return;
  state.cart.payment_type = input.value === "credit" ? "credit" : "cash";
  saveCart();
  renderTotals();
  if (state.cart.payment_type === "credit" && !state.cart.customer) customerPicker.focus();
}

export function onCustomerChange(customer: CartCustomer | null): void {
  state.cart.customer = customer;
  saveCart();
  renderTotals();
}
