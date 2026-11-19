import { ApiError } from "../../api";
import { customerFullName, fetchCustomer } from "../../customers";
import { elements } from "./elements";
import { state } from "./list-state";

/** Muestra u oculta la etiqueta del cliente filtrado y la completa con su nombre. */
export async function renderCustomerFilter(): Promise<void> {
  const id = state.customerId;
  elements.customerFilter.classList.toggle("d-none", id === null);
  if (id === null) return;
  elements.customerLabel.textContent = `Cliente #${id}`;
  try {
    const customer = await fetchCustomer(id);
    if (state.customerId !== id) return;
    elements.customerLabel.textContent = `Cliente: ${customerFullName(customer)} (${customer.document})`;
  } catch (err) {
    if (state.customerId !== id) return;
    elements.customerLabel.textContent =
      err instanceof ApiError && err.status === 404 ? `Cliente #${id} (no existe)` : `Cliente #${id}`;
  }
}
