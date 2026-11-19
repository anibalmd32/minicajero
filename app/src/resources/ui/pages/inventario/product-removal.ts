import { ApiError, errorMessage } from "../../api";
import { confirmAction } from "../../confirm";
import { withBusyButton } from "../../form";
import { restoreRowFocus, visibleRowAction } from "../../list";
import { deleteProduct, type Product, productLabel } from "../../products";
import { toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";
import { changeActive } from "./product-activation";
import { loadProducts } from "./product-list";

function focusAfterRemoval(rowIndex: number): void {
  const rows = elements.tableBody.rows;
  const row = elements.list.classList.contains("d-none") ? undefined : rows[Math.min(rowIndex, rows.length - 1)];
  (visibleRowAction(row, "delete") ?? elements.newButton).focus();
}

async function offerDeactivation(product: Product, button: HTMLButtonElement): Promise<void> {
  if (!product.active) {
    toastError(
      `No se puede eliminar ${productLabel(product)} porque tiene ventas registradas. Ya está inactivo, así que no aparece en nuevas ventas.`,
    );
    restoreRowFocus(button, elements.tableBody);
    return;
  }
  const deactivate = await confirmAction({
    title: "No se puede eliminar",
    message: `${productLabel(product)} tiene ventas registradas y se conserva para mantener el historial. ¿Quieres desactivarlo para que no aparezca en nuevas ventas?`,
    confirmText: "Desactivar",
    cancelText: "Cerrar",
    variant: "warning",
  });
  if (deactivate) await changeActive(product, false, button);
  else restoreRowFocus(button, elements.tableBody);
}

async function deleteAndReport(product: Product, button: HTMLButtonElement): Promise<boolean> {
  try {
    await withBusyButton(button, () => deleteProduct(product.id), "Eliminando…");
    toastSuccess(`Producto ${productLabel(product)} eliminado`);
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      await offerDeactivation(product, button);
      return false;
    }
    const missing = err instanceof ApiError && err.status === 404;
    toastError(
      missing ? `${productLabel(product)} ya no existe` : `No se pudo eliminar el producto. ${errorMessage(err)}`,
    );
    if (!missing) restoreRowFocus(button, elements.tableBody);
    return missing;
  }
}

/** Pide confirmación y elimina el producto; si tiene ventas ofrece desactivarlo. */
export async function removeProduct(product: Product, button: HTMLButtonElement): Promise<void> {
  const confirmed = await confirmAction({
    title: "Eliminar producto",
    message: `¿Eliminar ${productLabel(product)}? Esta acción no se puede deshacer.`,
    confirmText: "Eliminar",
    variant: "danger",
  });
  if (!confirmed) {
    restoreRowFocus(button, elements.tableBody);
    return;
  }
  const rowIndex = button.closest("tr")?.sectionRowIndex ?? 0;
  if (!(await deleteAndReport(product, button))) return;
  await loadProducts();
  focusAfterRemoval(rowIndex);
}
