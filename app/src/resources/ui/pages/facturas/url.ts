import { PARAMS, STATUS_PARAM_VALUES, state } from "./list-state";

const LIST_PATH = "/facturas";
const DETAIL_PATH = /^\/facturas\/([1-9]\d{0,15})\/?$/;

function listSearch(): string {
  const params = new URLSearchParams();
  if (state.q) params.set(PARAMS.q, state.q);
  if (state.status) params.set(PARAMS.status, STATUS_PARAM_VALUES[state.status]);
  if (state.customerId !== null) params.set(PARAMS.customer, String(state.customerId));
  if (state.from) params.set(PARAMS.from, state.from);
  if (state.to) params.set(PARAMS.to, state.to);
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Factura abierta según la dirección, o `null` si es el listado. */
export function openInvoiceId(): number | null {
  const match = DETAIL_PATH.exec(window.location.pathname);
  return match ? Number(match[1]) : null;
}

/** Refleja filtros y factura abierta en la dirección sin añadir historial. */
export function writeUrl(invoiceId: number | null = openInvoiceId()): void {
  const path = invoiceId === null ? LIST_PATH : `${LIST_PATH}/${invoiceId}`;
  window.history.replaceState(null, "", `${path}${listSearch()}`);
}
