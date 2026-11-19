import type { Product } from "../../products";
import { findProduct } from "./inventory-state";
import type { ProductAction } from "./product-actions";
import { changeActive } from "./product-activation";
import { openProductModal } from "./product-modal";
import { removeProduct } from "./product-removal";
import { openStockDialog } from "./stock-dialog";

function productFromControl(target: EventTarget | null): { control: HTMLElement; product: Product } | null {
  const control = target instanceof Element ? target.closest<HTMLElement>("[data-action]") : null;
  const product = control ? findProduct(Number(control.dataset.id)) : undefined;
  return control && product ? { control, product } : null;
}

export function onTableClick(event: MouseEvent): void {
  const found = productFromControl(event.target);
  if (!found || !(found.control instanceof HTMLButtonElement)) return;
  const { control, product } = found;
  const action = control.dataset.action as ProductAction;
  if (action === "edit") openProductModal(product);
  else if (action === "stock") openStockDialog(product);
  else if (action === "toggle") void changeActive(product, !product.active, control);
  else if (action === "delete") void removeProduct(product, control);
}

export function onTableChange(event: Event): void {
  const found = productFromControl(event.target);
  if (!found || !(found.control instanceof HTMLInputElement)) return;
  void changeActive(found.product, found.control.checked, found.control);
}
