/** Valores de un formulario: nombre del campo -> texto (recortado). */
export type FormValues = Record<string, string>;

export type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function isFormField(element: Element): element is FormField {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

export function findFields(form: HTMLFormElement, name: string): FormField[] {
  return [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)].filter(isFormField);
}

/** Lee los campos con nombre del formulario como texto recortado. Las casillas sin marcar no aparecen. */
export function serializeForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string") values[name] = value.trim();
  }
  return values;
}

function fillField(field: FormField, value: string | number | boolean | null | undefined): void {
  if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
    field.checked = field.type === "checkbox" ? Boolean(value) : field.value === String(value);
  } else {
    field.value = value === null || value === undefined ? "" : String(value);
  }
}

/** Rellena los campos del formulario con los valores dados (útil para modales de edición). */
export function fillForm(
  form: HTMLFormElement,
  values: Record<string, string | number | boolean | null | undefined>,
): void {
  for (const [name, value] of Object.entries(values)) {
    for (const field of findFields(form, name)) fillField(field, value);
  }
}
