import { Toast } from "./bootstrap";

/** Variante visual de un toast. */
export type ToastVariant = "success" | "danger" | "warning" | "info";

/** Botón opcional dentro del toast (p. ej. "Ajustar stock"); al pulsarlo el toast se cierra. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Opciones de un toast. */
export interface ToastOptions {
  action?: ToastAction;
  delayMs?: number;
  /** Un toast nuevo con la misma clave reemplaza al anterior en vez de apilarse (p. ej. escaneos seguidos). */
  key?: string;
}

const CONTAINER_ID = "app-toasts";
const DEFAULT_DELAY_MS = 4000;
const ERROR_DELAY_MS = 7000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "text-bg-success",
  danger: "text-bg-danger",
  warning: "text-bg-warning",
  info: "text-bg-primary",
};

function getContainer(): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) return existing;
  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.className = "toast-container position-fixed bottom-0 end-0 p-3";
  document.body.append(container);
  return container;
}

function actionButton(action: ToastAction, variant: ToastVariant): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `btn btn-sm flex-shrink-0 align-self-center me-2 ${variant === "warning" ? "btn-dark" : "btn-light"}`;
  button.dataset.bsDismiss = "toast";
  button.textContent = action.label;
  button.addEventListener("click", action.onClick);
  return button;
}

function buildToast(message: string, variant: ToastVariant, action?: ToastAction): HTMLElement {
  const isAlert = variant === "danger" || variant === "warning";
  const element = document.createElement("div");
  element.className = `toast align-items-center border-0 ${VARIANT_CLASSES[variant]}`;
  element.setAttribute("role", isAlert ? "alert" : "status");
  element.setAttribute("aria-live", isAlert ? "assertive" : "polite");
  element.setAttribute("aria-atomic", "true");

  const row = document.createElement("div");
  row.className = "d-flex";
  const body = document.createElement("div");
  body.className = "toast-body";
  body.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn-close me-2 m-auto";
  if (variant !== "warning") close.classList.add("btn-close-white");
  close.dataset.bsDismiss = "toast";
  close.setAttribute("aria-label", "Cerrar");
  row.append(body);
  if (action) row.append(actionButton(action, variant));
  row.append(close);
  element.append(row);
  return element;
}

/** Muestra un toast que se cierra solo; el mensaje se inserta como texto plano. */
export function showToast(message: string, variant: ToastVariant = "success", options: ToastOptions = {}): void {
  const element = buildToast(message, variant, options.action);
  const container = getContainer();
  if (options.key !== undefined) {
    element.dataset.toastKey = options.key;
    for (const previous of container.querySelectorAll<HTMLElement>("[data-toast-key]")) {
      if (previous.dataset.toastKey !== options.key) continue;
      previous.classList.add("d-none");
      Toast.getInstance(previous)?.hide();
    }
  }
  container.append(element);
  element.addEventListener("hidden.bs.toast", () => element.remove(), { once: true });
  const delay = options.delayMs ?? (variant === "danger" ? ERROR_DELAY_MS : DEFAULT_DELAY_MS);
  new Toast(element, { delay }).show();
}

/** Toast verde de confirmación. */
export function toastSuccess(message: string): void {
  showToast(message, "success");
}

/** Toast rojo de error. */
export function toastError(message: string): void {
  showToast(message, "danger");
}
