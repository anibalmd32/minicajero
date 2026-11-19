import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { NotFoundError } from "../../lib/http-errors";
import { formatDocument } from "../customers/customer-document";
import { getCustomer } from "../customers/customers.service";
import type { InvoiceDetail, InvoiceSummary } from "./invoice-listing.types";
import { findInvoiceById, listInvoiceItems, listInvoicePayments } from "./invoices.repository";
import type { InvoiceRow } from "./invoices.types";

export function toSummary(row: InvoiceRow): InvoiceSummary {
  const { customer_first_name, customer_last_name, customer_doc_type, customer_doc_number, ...invoice } = row;
  const customer =
    invoice.customer_id === null || customer_doc_type === null || customer_doc_number === null
      ? null
      : {
          id: invoice.customer_id,
          name: `${customer_first_name ?? ""} ${customer_last_name ?? ""}`.trim(),
          document: formatDocument(customer_doc_type, customer_doc_number),
        };
  return { ...invoice, customer };
}

export function findInvoiceOrThrow(id: number, db: Database): InvoiceRow {
  const row = findInvoiceById(id, db);
  if (!row) throw new NotFoundError("Factura no encontrada");
  return row;
}

/** Factura con sus líneas, abonos, saldo y cliente; 404 si no existe. */
export function getInvoice(id: number, db: Database = getDb()): InvoiceDetail {
  const summary = toSummary(findInvoiceOrThrow(id, db));
  return {
    ...summary,
    customer: summary.customer === null ? null : getCustomer(summary.customer.id, db),
    items: listInvoiceItems(id, db),
    payments: listInvoicePayments(id, db),
  };
}
