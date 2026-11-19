import type { Database } from "bun:sqlite";
import { getDb } from "../../db/connection";
import { ConflictError, NotFoundError } from "../../lib/http-errors";
import type { JsonObject } from "../../lib/request";
import { findCustomerById } from "../customers/customer-search.repository";
import { getCustomer } from "../customers/customers.service";
import { applyPayment } from "./payment-apply";
import { allocateFifo, fitToBalance } from "./payment-conversion";
import { convertOrThrow, exceedsBalanceError, rateForPayment } from "./payment-guards";
import { validatePayment } from "./payment-validation";
import { findPaymentById } from "./payments.repository";
import type { AppliedPayment, CustomerPaymentResult, PaymentAmounts, PaymentRequest } from "./payments.types";
import { listPendingInvoices } from "./statement.repository";
import type { PendingInvoiceRow } from "./statement.types";

interface CreatedPayment {
  id: number;
  invoice_number: number;
  invoice_settled: boolean;
}

interface CustomerPaymentOutcome {
  amounts: PaymentAmounts;
  rate: number;
  created: CreatedPayment[];
}

function applyAllocations(
  pending: readonly PendingInvoiceRow[],
  amounts: PaymentAmounts,
  request: PaymentRequest,
  rate: number,
  db: Database,
): CreatedPayment[] {
  const byId = new Map(pending.map((invoice) => [invoice.id, invoice]));
  const created: CreatedPayment[] = [];
  for (const allocation of allocateFifo(pending, amounts, request.currency, rate)) {
    const invoice = byId.get(allocation.invoice_id);
    if (!invoice) continue;
    const id = applyPayment(invoice, allocation, request, rate, db);
    created.push({
      id,
      invoice_number: invoice.number,
      invoice_settled: allocation.amount_usd_cents >= invoice.balance_usd_cents,
    });
  }
  return created;
}

function payCustomerDebt(customerId: number, request: PaymentRequest, db: Database): CustomerPaymentOutcome {
  const customer = findCustomerById(customerId, db);
  if (!customer) throw new NotFoundError("Cliente no encontrado");
  const pending = listPendingInvoices(customerId, db);
  const balance = pending.reduce((sum, invoice) => sum + invoice.balance_usd_cents, 0);
  const name = `${customer.first_name} ${customer.last_name}`;
  if (balance <= 0) throw new ConflictError(`${name} no tiene saldo pendiente`);
  const rate = rateForPayment(request, db);
  const amounts = fitToBalance(convertOrThrow(request, rate), request.currency, balance);
  if (!amounts) throw exceedsBalanceError(`de ${name}`, balance, request, rate);
  return { amounts, rate, created: applyAllocations(pending, amounts, request, rate, db) };
}

function toAppliedPayment(created: CreatedPayment, db: Database): AppliedPayment {
  const payment = findPaymentById(created.id, db);
  if (!payment) throw new Error("No se encontró un abono recién registrado");
  return { ...payment, invoice_number: created.invoice_number, invoice_settled: created.invoice_settled };
}

/**
 * Registra un abono global del cliente en una transacción: lo convierte con la tasa vigente y lo reparte entre sus
 * facturas pendientes empezando por la más antigua (ver `allocateFifo`), creando un abono por factura y saldando las
 * que lleguen a 0. 404 si el cliente no existe; 409 si no tiene deuda o si el abono supera su saldo total.
 */
export function recordCustomerPayment(
  customerId: number,
  body: JsonObject,
  db: Database = getDb(),
): CustomerPaymentResult {
  const request = validatePayment(body);
  const result = db.transaction(() => payCustomerDebt(customerId, request, db)).immediate();
  return {
    customer: getCustomer(customerId, db),
    ...result.amounts,
    currency: request.currency,
    rate: result.rate,
    payments: result.created.map((created) => toAppliedPayment(created, db)),
  };
}
