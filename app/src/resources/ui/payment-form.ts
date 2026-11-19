import type { FormValues } from "./form";
import { numberForRequest, parseDecimalInput } from "./format";
import { getCurrentRate, getDisplayCurrency } from "./money";
import { bindPaymentFormEvents } from "./payment-form-events";
import { collectParts, type PaymentFormParts, type PaymentFormState, selectedCurrency } from "./payment-form-parts";
import { renderPaymentPreview } from "./payment-form-preview";
import { paymentFormTemplate } from "./payment-form-template";
import type { PaymentInput } from "./payments";

/** Formulario de abono reutilizable (factura o abono global): moneda, monto, «Saldar todo» y vista previa de la conversión. */
export interface PaymentFormController {
  form: HTMLFormElement;
  /** Limpia el formulario para abonar sobre `balanceUsdCents`, con un texto que indica a qué se abona. */
  open: (balanceUsdCents: number, context: string) => void;
  focusAmount: () => void;
  /** Vuelve a pintar saldo y vista previa (tras cambiar la tasa o la moneda principal). */
  refresh: () => void;
  /** Datos listos para la API a partir de los valores del formulario. */
  input: (values: FormValues) => PaymentInput;
}

function openForm(
  form: HTMLFormElement,
  parts: PaymentFormParts,
  state: PaymentFormState,
  balanceUsdCents: number,
  context: string,
): void {
  form.reset();
  state.balance = balanceUsdCents;
  state.filledBySettle = false;
  parts.contextText.textContent = context;
  parts.contextText.classList.toggle("d-none", context === "");
  const preferred = getDisplayCurrency();
  for (const input of parts.currencyInputs) input.checked = input.value === preferred;
  renderPaymentPreview(parts, state);
}

function buildInput(parts: PaymentFormParts, values: FormValues): PaymentInput {
  const text = values.amount ?? "";
  return {
    amount: numberForRequest(parseDecimalInput(text), text),
    currency: selectedCurrency(parts),
    notes: values.notes ? values.notes : null,
    expected_rate: getCurrentRate(),
  };
}

/** Crea el formulario de abono dentro de `form` (vacío) usando `prefix` para los ids de sus campos. */
export function createPaymentForm(form: HTMLFormElement, prefix: string): PaymentFormController {
  form.innerHTML = paymentFormTemplate(prefix);
  form.autocomplete = "off";
  const parts = collectParts(form);
  const state: PaymentFormState = { balance: 0, filledBySettle: false };
  bindPaymentFormEvents(form, parts, state);
  return {
    form,
    open: (balanceUsdCents, context) => openForm(form, parts, state, balanceUsdCents, context),
    focusAmount: () => parts.amountInput.focus(),
    refresh: () => renderPaymentPreview(parts, state),
    input: (values) => buildInput(parts, values),
  };
}
