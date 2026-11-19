import "../../layout";
import { bindForm, clearFieldErrors } from "../../form";
import { onMoneyChange } from "../../money";
import { elements } from "./elements";
import { openPayment, submitPayment } from "./payment-modal";
import { currentStatement, load, renderStatement } from "./statement-load";

const { paymentForm, paymentModalElement, payButton } = elements;

function bindEvents(): void {
  elements.retryButton.addEventListener("click", () => void load());
  payButton.addEventListener("click", openPayment);
  bindForm(paymentForm.form, submitPayment);
  paymentModalElement.addEventListener("shown.bs.modal", () => paymentForm.focusAmount());
  paymentModalElement.addEventListener("hidden.bs.modal", () => {
    clearFieldErrors(paymentForm.form);
    if (!payButton.classList.contains("d-none")) payButton.focus();
  });
  onMoneyChange(() => {
    const statement = currentStatement();
    if (statement) renderStatement(statement);
    paymentForm.refresh();
  });
}

bindEvents();
void load();
