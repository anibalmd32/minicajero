import type { Pagination } from "../../lib/request";

/** Tipos de documento de identidad admitidos. */
export const DOC_TYPES = ["V", "E", "J"] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Cliente con su saldo pendiente (fiado) en centavos de USD. */
export interface CustomerRow {
  id: number;
  first_name: string;
  last_name: string;
  doc_type: DocType;
  doc_number: string;
  phone: string | null;
  balance_usd_cents: number;
  created_at: string;
  updated_at: string;
}

/** Datos editables de un cliente. */
export type CustomerData = {
  first_name: string;
  last_name: string;
  doc_type: DocType;
  doc_number: string;
  phone: string | null;
};

/** Cliente tal como lo expone la API: incluye el documento formateado (`V-12345678`) y su saldo pendiente. */
export interface Customer extends CustomerRow {
  document: string;
}

/** Página del listado de clientes. */
export interface CustomerPage extends Pagination {
  items: Customer[];
  total: number;
}

/** Criterios de búsqueda tal como llegan en la query string. */
export interface CustomerQuery {
  q: string | null;
  debtors: string | null;
}

/**
 * Término de búsqueda ya interpretado: por documento (`V-123`, dígitos sin ceros a la izquierda; coincide por prefijo)
 * o texto libre (en nombre y apellidos sin distinguir mayúsculas ni tildes).
 */
export type SearchTerm =
  | { kind: "document"; docType: DocType; digits: string }
  | { kind: "text"; text: string; phoneDigits: string | null; docDigits: string | null };

/** Criterios del listado de clientes. */
export interface CustomerFilter {
  terms: SearchTerm[];
  debtorsOnly: boolean;
}
