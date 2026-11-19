import type { PaymentType } from "../../../invoices";
import { formatDual } from "../../../money";
import { pickerElements } from "./picker-elements";
import { pickerState } from "./picker-state";

const { picker, selectedBox, selectedName, selectedMeta, feedback } = pickerElements;

export function showSelection(): void {
  const { current, editing } = pickerState;
  const showBox = current !== null && !editing;
  selectedBox.classList.toggle("d-none", !showBox);
  picker.classList.toggle("d-none", showBox);
  if (!current) return;
  selectedName.textContent = current.name;
  selectedMeta.replaceChildren(current.document);
  if (current.balance_usd_cents > 0) {
    const debt = document.createElement("span");
    debt.className = "text-danger";
    debt.innerHTML = ` · Debe ${formatDual(current.balance_usd_cents)}`;
    selectedMeta.append(debt);
  }
}

export function renderFeedback(paymentType: PaymentType): void {
  const missingForCredit = paymentType === "credit" && pickerState.current === null;
  feedback.classList.toggle("fw-semibold", missingForCredit);
  if (missingForCredit) feedback.textContent = "¿A quién se le fía? Búscalo o créalo.";
  else if (pickerState.current === null) feedback.textContent = "Sin cliente: se factura a Consumidor final.";
  else if (paymentType === "credit") feedback.textContent = "Se anotará en su cuenta.";
  else feedback.textContent = "";
}
