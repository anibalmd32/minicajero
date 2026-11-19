import { normalizeScanCode } from "../../../../modules/phone/phone.protocol";
import { elements } from "./elements";
import { sendCode } from "./scan-sender";

export function setManualError(text: string | null): void {
  elements.manualCode.classList.toggle("is-invalid", text !== null);
  elements.manualFeedback.textContent = text ?? "";
}

export function toggleKeyboard(): void {
  const { manualCode, keyboardToggle } = elements;
  const numeric = manualCode.inputMode === "numeric";
  manualCode.inputMode = numeric ? "text" : "numeric";
  keyboardToggle.textContent = numeric ? "123" : "ABC";
  keyboardToggle.setAttribute("aria-label", numeric ? "Usar teclado numérico" : "Usar teclado con letras");
  manualCode.blur();
  manualCode.focus();
}

export function submitManual(event: SubmitEvent): void {
  event.preventDefault();
  const { manualCode } = elements;
  if (!manualCode.value.trim()) {
    manualCode.focus();
    return;
  }
  const code = normalizeScanCode(manualCode.value);
  if (code === null) {
    setManualError("Revisa el código: solo números, letras sin tildes o símbolos.");
    manualCode.focus();
    return;
  }
  if (!sendCode(code, "manual")) {
    setManualError("No hay conexión con la computadora. Espera un momento.");
    return;
  }
  setManualError(null);
  manualCode.value = "";
  manualCode.focus();
}
