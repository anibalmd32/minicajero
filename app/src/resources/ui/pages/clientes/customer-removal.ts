import { ApiError, errorMessage } from "../../api";
import { confirmAction } from "../../confirm";
import { type Customer, customerFullName, deleteCustomer } from "../../customers";
import { withBusyButton } from "../../form";
import { restoreRowFocus, visibleRowAction } from "../../list";
import { toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";

const KEPT_FOR_HISTORY = "Los clientes con facturas se conservan para mantener el historial.";

function focusAfterRemoval(rowIndex: number): void {
  const rows = elements.tableBody.rows;
  const row = elements.list.classList.contains("d-none") ? undefined : rows[Math.min(rowIndex, rows.length - 1)];
  (visibleRowAction(row, "delete") ?? elements.newButton).focus();
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

function deleteErrorMessage(err: unknown, customer: Customer): string {
  if (err instanceof ApiError && err.status === 409) return `${err.message}. ${KEPT_FOR_HISTORY}`;
  if (isNotFound(err)) return `${customerFullName(customer)} ya no existe`;
  return `No se pudo eliminar el cliente. ${errorMessage(err)}`;
}

function confirmRemoval(customer: Customer): Promise<boolean> {
  return confirmAction({
    title: "Eliminar cliente",
    message: `¿Eliminar a ${customerFullName(customer)} (${customer.document})? Esta acción no se puede deshacer.`,
    confirmText: "Eliminar",
    variant: "danger",
  });
}

async function deleteAndReport(customer: Customer, button: HTMLButtonElement): Promise<boolean> {
  try {
    await withBusyButton(button, () => deleteCustomer(customer.id), "Eliminando…");
    toastSuccess(`Cliente ${customerFullName(customer)} eliminado`);
    return true;
  } catch (err) {
    toastError(deleteErrorMessage(err, customer));
    return isNotFound(err);
  }
}

/**
 * Elimina un cliente tras confirmarlo; no lo intenta si tiene saldo pendiente.
 * `reload` recarga el listado antes de mover el foco a la fila siguiente.
 */
export async function removeCustomer(
  customer: Customer,
  button: HTMLButtonElement,
  reload: () => Promise<void>,
): Promise<void> {
  if (customer.balance_usd_cents > 0) {
    toastError(
      `No se puede eliminar a ${customerFullName(customer)} porque tiene saldo pendiente. ${KEPT_FOR_HISTORY}`,
    );
    return;
  }
  const rowIndex = button.closest("tr")?.sectionRowIndex ?? 0;
  if (!(await confirmRemoval(customer)) || !(await deleteAndReport(customer, button))) {
    restoreRowFocus(button, elements.tableBody);
    return;
  }
  await reload();
  focusAfterRemoval(rowIndex);
}
