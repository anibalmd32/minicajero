import { Modal } from "./bootstrap";

/** Opciones del diálogo de confirmación. */
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
}

interface ConfirmDialog {
  element: HTMLElement;
  confirmButton: HTMLButtonElement;
}

const DIALOG_TEMPLATE = `
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title fs-5 text-break" data-role="title"></h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body"><p class="mb-0 text-break" data-role="message"></p></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-role="cancel"></button>
        <button type="button" class="btn" data-role="confirm"></button>
      </div>
    </div>
  </div>`;

function requirePart<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const part = root.querySelector<T>(`[data-role="${role}"]`);
  if (!part) throw new Error(`Falta el elemento "${role}" en el diálogo de confirmación`);
  return part;
}

function buildDialog(options: ConfirmOptions): ConfirmDialog {
  const element = document.createElement("div");
  element.className = "modal fade";
  element.tabIndex = -1;
  element.setAttribute("aria-hidden", "true");
  element.innerHTML = DIALOG_TEMPLATE;

  const title = requirePart(element, "title");
  const titleId = `confirm-title-${crypto.randomUUID()}`;
  title.id = titleId;
  title.textContent = options.title ?? "Confirmar acción";
  element.setAttribute("aria-labelledby", titleId);
  requirePart(element, "message").textContent = options.message;
  requirePart(element, "cancel").textContent = options.cancelText ?? "Cancelar";

  const confirmButton = requirePart<HTMLButtonElement>(element, "confirm");
  confirmButton.textContent = options.confirmText ?? "Confirmar";
  confirmButton.classList.add(`btn-${options.variant ?? "danger"}`);
  return { element, confirmButton };
}

/**
 * Abre un modal de confirmación. Resuelve `true` si el usuario confirma y `false`
 * si cancela, pulsa Esc o hace clic fuera.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const { element, confirmButton } = buildDialog(options);
  document.body.append(element);
  const modal = new Modal(element);

  return new Promise<boolean>((resolve) => {
    let confirmed = false;
    confirmButton.addEventListener("click", () => {
      confirmed = true;
      modal.hide();
    });
    element.addEventListener("shown.bs.modal", () => confirmButton.focus(), { once: true });
    element.addEventListener(
      "hidden.bs.modal",
      () => {
        modal.dispose();
        element.remove();
        resolve(confirmed);
      },
      { once: true },
    );
    modal.show();
  });
}
