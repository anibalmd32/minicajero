import type { InvoiceStatus } from "../../invoices";

/** Filtros y posición del listado de facturas. */
export interface ListState {
  q: string;
  status: InvoiceStatus | null;
  customerId: number | null;
  from: string;
  to: string;
  offset: number;
}

/** Tamaño de página del listado. */
export const PAGE_SIZE = 20;

/** Nombres de los parámetros de la dirección. */
export const PARAMS = { q: "q", status: "estado", customer: "cliente", from: "desde", to: "hasta" } as const;

/** Valor del parámetro de estado para cada estado de factura. */
export const STATUS_PARAM_VALUES: Record<InvoiceStatus, string> = {
  paid: "pagadas",
  pending: "pendientes",
  void: "anuladas",
};

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const ID_PARAM = /^[1-9]\d{0,15}$/;

function readStatusParam(value: string | null): InvoiceStatus | null {
  const entry = Object.entries(STATUS_PARAM_VALUES).find(([, param]) => param === value?.trim().toLowerCase());
  return entry ? (entry[0] as InvoiceStatus) : null;
}

function readDateParam(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  return DATE_PARAM.test(trimmed) ? trimmed : "";
}

function readStateFromUrl(): ListState {
  const params = new URLSearchParams(window.location.search);
  const customer = params.get(PARAMS.customer)?.trim() ?? "";
  return {
    q: params.get(PARAMS.q)?.trim() ?? "",
    status: readStatusParam(params.get(PARAMS.status)),
    customerId: ID_PARAM.test(customer) ? Number(customer) : null,
    from: readDateParam(params.get(PARAMS.from)),
    to: readDateParam(params.get(PARAMS.to)),
    offset: 0,
  };
}

/** Estado vivo del listado, inicializado desde la dirección. */
export const state: ListState = readStateFromUrl();

/** `true` si hay algún filtro activo. */
export function hasFilters(): boolean {
  return state.q !== "" || state.status !== null || state.customerId !== null || state.from !== "" || state.to !== "";
}
