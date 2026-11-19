import { toCents } from "../../../../lib/money";
import { parseDecimalInput } from "../../format";
import { getCurrentRate, getDisplayCurrency } from "../../money";
import { type ChangeDue, computeChange, type ReceivedCurrency } from "../../sale-cart";
import { amountText } from "./amounts";
import { modalElements } from "./modal-elements";
import { currentTotals } from "./sale-totals";

const { receivedInput, receivedCurrencyInputs, changeResult } = modalElements;

function receivedCurrency(): ReceivedCurrency {
  return receivedCurrencyInputs.find((input) => input.checked)?.value === "VES" ? "VES" : "USD";
}

export function currentChange(): ChangeDue | null {
  const amount = parseDecimalInput(receivedInput.value);
  const rate = getCurrentRate();
  const totals = currentTotals();
  if (amount === null || Number.isNaN(amount) || amount < 0 || rate === null || totals.total_bs_cents === null)
    return null;
  try {
    return computeChange(totals.total_usd_cents, totals.total_bs_cents, toCents(amount), receivedCurrency(), rate);
  } catch (err) {
    if (err instanceof RangeError) return null;
    throw err;
  }
}

export function changeInReceivedCurrency(change: ChangeDue): number {
  return receivedCurrency() === "VES" ? change.bs_cents : change.usd_cents;
}

export function changeText(change: ChangeDue): string {
  const difference = changeInReceivedCurrency(change);
  const amount = amountText(Math.abs(change.usd_cents), Math.abs(change.bs_cents));
  if (difference === 0) return "Pago exacto: no hay vuelto.";
  return difference < 0 ? `Faltan ${amount}` : `Vuelto: ${amount}`;
}

export function renderChange(): void {
  const text = receivedInput.value.trim();
  const change = currentChange();
  receivedInput.classList.toggle("is-invalid", text !== "" && change === null);
  if (text === "") {
    changeResult.className = "sale-change-result";
    changeResult.textContent = "";
    return;
  }
  if (change === null) {
    changeResult.className = "sale-change-result text-danger";
    changeResult.textContent = "Escribe un monto, por ejemplo 20 o 20,50.";
    return;
  }
  const short = changeInReceivedCurrency(change) < 0;
  changeResult.className = `sale-change-result ${short ? "text-danger" : "is-change"}`;
  changeResult.textContent = changeText(change);
}

export function resetChangeForm(): void {
  receivedInput.value = "";
  const currency = getDisplayCurrency();
  for (const input of receivedCurrencyInputs) input.checked = input.value === currency;
  renderChange();
}

export function onReceivedCurrencyChange(): void {
  renderChange();
  receivedInput.focus();
}
