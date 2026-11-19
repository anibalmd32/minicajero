import { clearFieldErrors } from "./form";
import { formatCentsInput } from "./format";
import { getCurrentRate } from "./money";
import { type PaymentFormParts, type PaymentFormState, selectedCurrency } from "./payment-form-parts";
import { renderPaymentPreview } from "./payment-form-preview";
import { settleAmountCents } from "./payments";

function settleAll(form: HTMLFormElement, parts: PaymentFormParts, state: PaymentFormState): void {
  const rate = getCurrentRate();
  if (rate === null || state.balance <= 0) return;
  parts.amountInput.value = formatCentsInput(settleAmountCents(state.balance, selectedCurrency(parts), rate));
  clearFieldErrors(form, "amount");
  state.filledBySettle = true;
  renderPaymentPreview(parts, state);
  parts.amountInput.focus();
}

function onCurrencyChange(form: HTMLFormElement, parts: PaymentFormParts, state: PaymentFormState): void {
  if (state.filledBySettle) settleAll(form, parts, state);
  else renderPaymentPreview(parts, state);
  parts.amountInput.focus();
}

/** Conecta cambio de moneda, escritura del monto y «Saldar todo». */
export function bindPaymentFormEvents(form: HTMLFormElement, parts: PaymentFormParts, state: PaymentFormState): void {
  for (const input of parts.currencyInputs)
    input.addEventListener("change", () => onCurrencyChange(form, parts, state));
  parts.amountInput.addEventListener("input", () => {
    state.filledBySettle = false;
    renderPaymentPreview(parts, state);
  });
  parts.settleButton.addEventListener("click", () => settleAll(form, parts, state));
}
