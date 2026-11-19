import { withBusyButton } from "./form-busy";
import { clearFieldErrors, reportFormError } from "./form-errors";
import { type FormValues, isFormField, serializeForm } from "./form-fields";

function submitButtonOf(form: HTMLFormElement, event: SubmitEvent): HTMLButtonElement | null {
  if (event.submitter instanceof HTMLButtonElement) return event.submitter;
  return (
    form.querySelector<HTMLButtonElement>("button[type='submit'], button:not([type])") ??
    (form.id ? document.querySelector<HTMLButtonElement>(`button[type='submit'][form="${CSS.escape(form.id)}"]`) : null)
  );
}

function clearErrorOfEditedField(form: HTMLFormElement, event: Event): void {
  const target = event.target;
  if (target instanceof Element && isFormField(target) && target.name) clearFieldErrors(form, target.name);
}

/**
 * Conecta el envío del formulario (Enter o botón): evita envíos dobles, limpia errores,
 * pone el botón en espera y muestra los errores de la API por campo si `onSubmit` falla.
 * Al editar un campo con error se quita su marca.
 */
export function bindForm(
  form: HTMLFormElement,
  onSubmit: (values: FormValues, form: HTMLFormElement) => Promise<void>,
): void {
  let submitting = false;
  form.noValidate = true;
  form.addEventListener("input", (event) => clearErrorOfEditedField(form, event));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    clearFieldErrors(form);
    const button = submitButtonOf(form, event);
    const run = () => onSubmit(serializeForm(form), form);
    try {
      await (button ? withBusyButton(button, run) : run());
    } catch (err) {
      reportFormError(form, err);
    } finally {
      submitting = false;
    }
  });
}
