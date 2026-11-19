const busyLabels = new WeakMap<HTMLButtonElement, string>();

function createSpinner(): HTMLSpanElement {
  const spinner = document.createElement("span");
  spinner.className = "spinner-border spinner-border-sm me-2";
  spinner.setAttribute("aria-hidden", "true");
  return spinner;
}

function startBusy(button: HTMLButtonElement, busyText: string): void {
  if (busyLabels.has(button)) return;
  busyLabels.set(button, button.innerHTML);
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.replaceChildren(createSpinner(), document.createTextNode(busyText));
}

function stopBusy(button: HTMLButtonElement): void {
  const original = busyLabels.get(button);
  if (original === undefined) return;
  busyLabels.delete(button);
  button.innerHTML = original;
  button.disabled = false;
  button.removeAttribute("aria-busy");
}

/** Deshabilita el botón y muestra un spinner (o lo restaura cuando `busy` es `false`). */
export function setButtonBusy(button: HTMLButtonElement, busy: boolean, busyText = "Guardando…"): void {
  if (busy) startBusy(button, busyText);
  else stopBusy(button);
}

/** Ejecuta `task` con el botón en estado ocupado y lo restaura siempre al terminar. */
export async function withBusyButton<T>(
  button: HTMLButtonElement,
  task: () => Promise<T>,
  busyText?: string,
): Promise<T> {
  setButtonBusy(button, true, busyText);
  try {
    return await task();
  } finally {
    setButtonBusy(button, false);
  }
}
