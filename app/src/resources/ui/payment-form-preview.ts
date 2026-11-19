import { formatBs, formatRate, formatUsd } from "./format";
import { formatDual, getCurrentRate } from "./money";
import {
  enteredAmountCents,
  type PaymentFormParts,
  type PaymentFormState,
  selectedCurrency,
} from "./payment-form-parts";
import { type PaymentCurrency, previewPayment, settleAmountCents } from "./payments";

function previewLine(text: string, className = ""): HTMLElement {
  const line = document.createElement("span");
  line.className = `d-block ${className}`.trim();
  line.textContent = text;
  return line;
}

function outcomeLine(
  result: ReturnType<typeof previewPayment>,
  currency: PaymentCurrency,
  rate: number,
  balance: number,
): HTMLElement {
  if (result.exceeds) {
    const maximum = currency === "USD" ? formatUsd(balance) : formatBs(settleAmountCents(balance, "VES", rate));
    return previewLine(`Supera el saldo pendiente: como máximo ${maximum}.`, "text-danger fw-semibold");
  }
  if (result.settles) return previewLine("Con este abono se salda toda la deuda.", "text-success fw-semibold");
  return previewLine(`Saldo después del abono: ${formatUsd(result.remaining_usd_cents)}.`);
}

function previewLines(cents: number, currency: PaymentCurrency, rate: number, balance: number): HTMLElement[] {
  const result = previewPayment(cents, currency, rate, balance);
  const equivalent = currency === "USD" ? formatBs(result.bs_cents) : formatUsd(result.usd_cents);
  return [
    previewLine(`Equivale a ${equivalent} con la tasa Bs ${formatRate(rate)} por $.`),
    outcomeLine(result, currency, rate, balance),
  ];
}

/** Repinta símbolo, saldo, aviso de tasa y vista previa de la conversión. */
export function renderPaymentPreview(parts: PaymentFormParts, state: PaymentFormState): void {
  const rate = getCurrentRate();
  const currency = selectedCurrency(parts);
  parts.symbol.textContent = currency === "USD" ? "$" : "Bs";
  parts.noRate.classList.toggle("d-none", rate !== null);
  parts.settleButton.disabled = rate === null || state.balance <= 0;
  parts.balanceText.innerHTML = formatDual(state.balance);
  const cents = enteredAmountCents(parts);
  if (rate === null || cents === null) {
    parts.preview.replaceChildren(rate === null ? "" : `Tasa vigente: Bs ${formatRate(rate)} por $.`);
    return;
  }
  parts.preview.replaceChildren(...previewLines(cents, currency, rate, state.balance));
}
