import { toCents } from "../../lib/money";
import { parseDecimalInput } from "./format";
import type { PaymentCurrency } from "./payments";

/** Elementos internos del formulario de abono. */
export interface PaymentFormParts {
  contextText: HTMLElement;
  balanceText: HTMLElement;
  symbol: HTMLElement;
  settleButton: HTMLButtonElement;
  preview: HTMLElement;
  noRate: HTMLElement;
  amountInput: HTMLInputElement;
  currencyInputs: HTMLInputElement[];
}

/** Estado mutable del formulario de abono. */
export interface PaymentFormState {
  balance: number;
  filledBySettle: boolean;
}

function part<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const element = root.querySelector<T>(`[data-role="${role}"]`);
  if (!element) throw new Error(`Falta el elemento "${role}" en el formulario de abono`);
  return element;
}

function requireAmountInput(form: HTMLFormElement): HTMLInputElement {
  const input = form.querySelector<HTMLInputElement>('input[name="amount"]');
  if (!input) throw new Error('Falta el campo "amount" en el formulario de abono');
  return input;
}

/** Busca una sola vez los elementos del formulario ya construido. */
export function collectParts(form: HTMLFormElement): PaymentFormParts {
  return {
    contextText: part(form, "context"),
    balanceText: part(form, "balance"),
    symbol: part(form, "symbol"),
    settleButton: part<HTMLButtonElement>(form, "settle"),
    preview: part(form, "preview"),
    noRate: part(form, "no-rate"),
    amountInput: requireAmountInput(form),
    currencyInputs: [...form.querySelectorAll<HTMLInputElement>('input[name="currency"]')],
  };
}

/** Moneda elegida en el formulario (dólares si no hay ninguna marcada). */
export function selectedCurrency(parts: PaymentFormParts): PaymentCurrency {
  return parts.currencyInputs.find((input) => input.checked)?.value === "VES" ? "VES" : "USD";
}

/** Monto escrito en centavos, o `null` si está vacío o no es válido. */
export function enteredAmountCents(parts: PaymentFormParts): number | null {
  const parsed = parseDecimalInput(parts.amountInput.value);
  if (parsed === null || Number.isNaN(parsed) || parsed <= 0) return null;
  try {
    return toCents(parsed);
  } catch {
    return null;
  }
}
