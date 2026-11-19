import { errorMessage } from "../../api";
import { withBusyButton } from "../../form";
import { restoreRowFocus } from "../../list";
import { type Product, productLabel, setProductActive } from "../../products";
import { toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";
import { loadProducts } from "./product-list";

/** Activa o desactiva un producto desde su botón o interruptor, recarga el listado y devuelve el foco. */
export async function changeActive(product: Product, active: boolean, control: HTMLElement): Promise<void> {
  const run = () => setProductActive(product, active);
  try {
    if (control instanceof HTMLButtonElement) {
      await withBusyButton(control, run, active ? "Activando…" : "Desactivando…");
    } else {
      control.toggleAttribute("disabled", true);
      await run();
    }
    toastSuccess(`Producto ${productLabel(product)} ${active ? "activado" : "desactivado"}`);
  } catch (err) {
    toastError(`No se pudo ${active ? "activar" : "desactivar"} el producto. ${errorMessage(err)}`);
  }
  await loadProducts();
  restoreRowFocus(control, elements.tableBody);
}
