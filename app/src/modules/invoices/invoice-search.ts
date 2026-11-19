import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import type { Pagination } from "../../lib/request";
import { toSummary } from "./invoice-detail";
import { parseInvoiceFilter } from "./invoice-filter";
import { countInvoices, listInvoices, sumInvoices } from "./invoice-list.repository";
import type { InvoiceFilter, InvoicePage, InvoiceQuery, InvoiceSummary } from "./invoice-listing.types";

const NO_INVOICE_FILTER: InvoiceFilter = {
  terms: [],
  status: null,
  paymentType: null,
  customerId: null,
  createdFrom: null,
  createdTo: null,
};

/** Página de facturas filtrada, con los totales agregados de todas las que cumplen el filtro. */
export function searchInvoices(query: InvoiceQuery, page: Pagination, db: Database = getDb()): InvoicePage {
  const filter = parseInvoiceFilter(query);
  return {
    items: listInvoices(filter, page.limit, page.offset, db).map(toSummary),
    total: countInvoices(filter, db),
    limit: page.limit,
    offset: page.offset,
    totals: sumInvoices(filter, db),
  };
}

/** Últimas `limit` facturas (de cualquier estado), de la más reciente a la más antigua. */
export function listRecentInvoices(limit: number, db: Database = getDb()): InvoiceSummary[] {
  return listInvoices(NO_INVOICE_FILTER, limit, 0, db).map(toSummary);
}
