import { type Product, productLabel } from "../../products";

export type ProductAction = "edit" | "stock" | "toggle" | "delete";

const ACTION_LABELS: Record<ProductAction, string> = {
  edit: "Editar",
  stock: "Ajustar stock",
  toggle: "",
  delete: "Eliminar",
};

const ACTION_CLASSES: Record<ProductAction, string> = {
  edit: "btn btn-sm btn-outline-primary",
  stock: "btn btn-sm btn-outline-secondary",
  toggle: "btn btn-sm btn-outline-secondary",
  delete: "btn btn-sm btn-outline-danger",
};

const COMPACT_ACTION_CLASSES: Record<ProductAction, string> = {
  edit: "btn btn-link btn-sm p-0 text-decoration-none",
  stock: "btn btn-link btn-sm p-0 text-decoration-none",
  toggle: "btn btn-link btn-sm p-0 link-secondary text-decoration-none",
  delete: "btn btn-link btn-sm p-0 link-danger text-decoration-none",
};

function actionLabel(action: ProductAction, product: Product): string {
  if (action === "toggle") return product.active ? "Desactivar" : "Activar";
  return ACTION_LABELS[action];
}

export function actionButton(action: ProductAction, product: Product, compact = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = (compact ? COMPACT_ACTION_CLASSES : ACTION_CLASSES)[action];
  button.dataset.action = action;
  button.dataset.id = String(product.id);
  button.textContent = compact && action === "stock" ? "Stock" : actionLabel(action, product);
  button.setAttribute("aria-label", `${actionLabel(action, product)}: ${productLabel(product)}`);
  return button;
}
