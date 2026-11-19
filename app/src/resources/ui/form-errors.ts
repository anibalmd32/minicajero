import { ApiError, errorMessage, type FieldErrors } from "./api";
import { type FormField, findFields } from "./form-fields";
import { toastError } from "./toast";

const FEEDBACK_ATTRIBUTE = "data-feedback-for";

function feedbackAnchor(field: FormField): Element {
  return field.closest(".input-group, .form-check") ?? field;
}

/** Quita las marcas de error (`is-invalid` y mensajes) de un campo o de todo el formulario. */
export function clearFieldErrors(form: HTMLFormElement, name?: string): void {
  const fieldSelector = name ? `[name="${CSS.escape(name)}"].is-invalid` : ".is-invalid";
  const feedbackSelector = name ? `[${FEEDBACK_ATTRIBUTE}="${CSS.escape(name)}"]` : `[${FEEDBACK_ATTRIBUTE}]`;
  for (const field of form.querySelectorAll(fieldSelector)) {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
  }
  for (const feedback of form.querySelectorAll(feedbackSelector)) feedback.remove();
}

function markInvalid(fields: FormField[], name: string, message: string): void {
  for (const field of fields) {
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
  }
  const last = fields.at(-1);
  if (!last) return;
  const feedback = document.createElement("div");
  feedback.className = "invalid-feedback d-block";
  feedback.setAttribute(FEEDBACK_ATTRIBUTE, name);
  feedback.textContent = message;
  feedbackAnchor(last).after(feedback);
}

/**
 * Marca con `is-invalid` y un `invalid-feedback` cada campo con error y enfoca el primero.
 * Devuelve los mensajes cuyo campo no existe en el formulario.
 */
export function showFieldErrors(form: HTMLFormElement, errors: FieldErrors): string[] {
  clearFieldErrors(form);
  const unmatched: string[] = [];
  let firstInvalid: FormField | undefined;
  for (const [name, message] of Object.entries(errors)) {
    const fields = findFields(form, name);
    if (fields.length === 0) {
      unmatched.push(message);
      continue;
    }
    markInvalid(fields, name, message);
    firstInvalid ??= fields[0];
  }
  firstInvalid?.focus();
  return unmatched;
}

/**
 * Muestra un error en el formulario: errores por campo junto a cada campo (enfocando el primero)
 * y un toast solo para lo que no tiene campo donde mostrarse.
 */
export function reportFormError(form: HTMLFormElement, err: unknown): void {
  if (err instanceof ApiError && err.hasFieldErrors) {
    const unmatched = showFieldErrors(form, err.details);
    if (unmatched.length > 0) toastError([err.message, ...unmatched].join(". "));
    return;
  }
  toastError(errorMessage(err));
}
