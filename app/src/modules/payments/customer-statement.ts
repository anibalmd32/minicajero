import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { getCustomer } from "../customers/customers.service";
import { listPendingInvoices, listStatementInvoices, listStatementPayments } from "./statement.repository";
import type { CustomerStatement } from "./statement.types";
import { buildStatementEntries } from "./statement-entries";
import { summarizeStatement } from "./statement-summary";

export { buildStatementEntries };

/** Estado de cuenta del cliente: facturas (fiadas y de contado) y abonos en orden cronológico con saldo acumulado; 404 si no existe. */
export function getCustomerStatement(customerId: number, db: Database = getDb()): CustomerStatement {
  return db.transaction(() => {
    const customer = getCustomer(customerId, db);
    const invoices = listStatementInvoices(customerId, db);
    const payments = listStatementPayments(customerId, db);
    const pending = listPendingInvoices(customerId, db);
    return {
      customer,
      summary: summarizeStatement(customer, invoices, payments, pending),
      pending_invoices: pending,
      entries: buildStatementEntries(invoices, payments),
      generated_at: new Date().toISOString(),
    };
  })();
}
