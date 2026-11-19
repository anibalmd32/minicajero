import { type Database, SQLiteError } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject, Pagination } from "../../lib/request";
import { formatDocument } from "./customer-document";
import { parseCustomerFilter } from "./customer-filter";
import { countCustomers, findCustomerById, listCustomers } from "./customer-search.repository";
import { validateCustomer } from "./customer-validation";
import {
  countCustomerInvoices,
  deleteCustomer as deleteCustomerRow,
  findCustomerIdByDocument,
  insertCustomer,
  updateCustomer as updateCustomerRow,
} from "./customers.repository";
import type { Customer, CustomerData, CustomerPage, CustomerQuery, CustomerRow } from "./customers.types";

function toCustomer(row: CustomerRow): Customer {
  return { ...row, document: formatDocument(row.doc_type, row.doc_number) };
}

/** Página de clientes con su saldo, filtrada por búsqueda y opcionalmente solo deudores. */
export function searchCustomers(query: CustomerQuery, page: Pagination, db: Database = getDb()): CustomerPage {
  const filter = parseCustomerFilter(query);
  const items = listCustomers(filter, page.limit, page.offset, db).map(toCustomer);
  return { items, total: countCustomers(filter, db), limit: page.limit, offset: page.offset };
}

/** Cliente por id con su saldo; 404 si no existe. */
export function getCustomer(id: number, db: Database = getDb()): Customer {
  const row = findCustomerById(id, db);
  if (!row) throw new NotFoundError("Cliente no encontrado");
  return toCustomer(row);
}

function duplicateDocumentError(data: CustomerData): ConflictError {
  const document = formatDocument(data.doc_type, data.doc_number);
  return new ConflictError(`Ya existe un cliente con el documento ${document}`, {
    doc_number: `El documento ${document} ya está registrado`,
  });
}

function assertDocumentAvailable(data: CustomerData, ownId: number | null, db: Database): void {
  const existingId = findCustomerIdByDocument(data.doc_type, data.doc_number, db);
  if (existingId !== null && existingId !== ownId) throw duplicateDocumentError(data);
}

function isConstraintError(err: unknown, code: string): boolean {
  return err instanceof SQLiteError && err.code === code;
}

function saveWithDocumentCheck<T>(data: CustomerData, ownId: number | null, db: Database, save: () => T): T {
  try {
    return db.transaction(() => {
      assertDocumentAvailable(data, ownId, db);
      return save();
    })();
  } catch (err) {
    if (isConstraintError(err, "SQLITE_CONSTRAINT_UNIQUE")) throw duplicateDocumentError(data);
    throw err;
  }
}

/** Registra un cliente nuevo; 409 si el documento ya existe. */
export function createCustomer(body: JsonObject, db: Database = getDb()): Customer {
  const data = validateCustomer(body);
  const id = saveWithDocumentCheck(data, null, db, () => insertCustomer(data, db));
  return getCustomer(id, db);
}

/** Reemplaza los datos de un cliente; 404 si no existe y 409 si el documento pertenece a otro cliente. */
export function updateCustomer(id: number, body: JsonObject, db: Database = getDb()): Customer {
  const data = validateCustomer(body);
  const updated = saveWithDocumentCheck(data, id, db, () => updateCustomerRow(id, data, db));
  if (!updated) throw new NotFoundError("Cliente no encontrado");
  return getCustomer(id, db);
}

function hasInvoicesError(invoiceCount: number): ConflictError {
  const label = invoiceCount === 1 ? "1 factura registrada" : `${invoiceCount} facturas registradas`;
  return new ConflictError(`No se puede eliminar el cliente porque tiene ${label}`);
}

/** Elimina un cliente sin facturas; 404 si no existe y 409 si tiene facturas asociadas. */
export function deleteCustomer(id: number, db: Database = getDb()): void {
  try {
    db.transaction(() => {
      const invoiceCount = countCustomerInvoices(id, db);
      if (invoiceCount > 0) throw hasInvoicesError(invoiceCount);
      if (!deleteCustomerRow(id, db)) throw new NotFoundError("Cliente no encontrado");
    })();
  } catch (err) {
    if (isConstraintError(err, "SQLITE_CONSTRAINT_FOREIGNKEY")) throw hasInvoicesError(countCustomerInvoices(id, db));
    throw err;
  }
}
