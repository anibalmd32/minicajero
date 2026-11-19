import { bindModal } from "./modal-bindings";
import { createModalParts, type ModalParts } from "./modal-parts";
import { state } from "./modal-state";
import { MODAL_ID } from "./modal-template";

const CLOSE_FALLBACK_MS = 1500;

function getParts(): ModalParts {
  if (state.parts) return state.parts;
  const parts = createModalParts();
  state.parts = parts;
  bindModal(parts);
  return parts;
}

/** Abre el diálogo "Conectar teléfono" con un QR nuevo. */
export function openPhoneModal(): void {
  getParts().modal.show();
}

/**
 * Cierra el diálogo "Conectar teléfono" si está abierto (o abriéndose) y espera a que termine de cerrarse,
 * como mucho un segundo y medio.
 */
export function closePhoneModal(): Promise<void> {
  const { parts } = state;
  if (!parts || state.phase === "closed") return Promise.resolve();
  const { element, modal } = parts;
  return new Promise((resolve) => {
    const hide = (): void => modal.hide();
    const done = (): void => {
      window.clearTimeout(fallback);
      element.removeEventListener("hidden.bs.modal", done);
      element.removeEventListener("shown.bs.modal", hide);
      resolve();
    };
    const fallback = window.setTimeout(done, CLOSE_FALLBACK_MS);
    element.addEventListener("hidden.bs.modal", done);
    if (state.phase === "opening") element.addEventListener("shown.bs.modal", hide, { once: true });
    else if (state.phase === "open") hide();
  });
}

/** Otro diálogo abierto en la página (sin contar "Conectar teléfono"), o `null` si no hay. */
export function otherOpenModal(): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(".modal.show")].find((element) => element.id !== MODAL_ID) ?? null;
}
