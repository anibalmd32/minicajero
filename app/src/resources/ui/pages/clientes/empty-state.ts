import { elements } from "./elements";
import { hasFilters, type ListState } from "./list-state";

/** Motivo del listado vacío: no hay clientes, o los filtros no encuentran ninguno. */
export type EmptyKind = "none" | "no-match";

function noMatchText(state: ListState): string {
  const debtorsSuffix = state.debtorsOnly ? " con saldo pendiente" : "";
  if (state.q === "") return "No hay clientes con saldo pendiente. Todos están al día.";
  return `No se encontraron clientes${debtorsSuffix} para «${state.q}». Prueba con otro nombre, documento o teléfono.`;
}

/** Pinta el mensaje del estado vacío según los filtros y devuelve su motivo. */
export function renderEmptyState(state: ListState): EmptyKind {
  if (!hasFilters(state)) {
    elements.emptyTitle.textContent = "Aún no hay clientes";
    elements.emptyText.textContent =
      "Registra a tus clientes para venderles a crédito (fiado) y llevar el control de su saldo.";
    elements.emptyAction.textContent = "Registrar el primer cliente";
    return "none";
  }
  elements.emptyTitle.textContent = "Ningún cliente coincide";
  elements.emptyText.textContent = noMatchText(state);
  elements.emptyAction.textContent = "Quitar filtros";
  return "no-match";
}
