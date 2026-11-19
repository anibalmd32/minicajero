import { type Customer, customerFullName } from "../../../customers";
import type { CartCustomer } from "../../../sale-cart";

/** Resumen del cliente para guardarlo en el carrito. */
export function toCartCustomer(customer: Customer): CartCustomer {
  return {
    id: customer.id,
    name: customerFullName(customer),
    document: customer.document,
    balance_usd_cents: customer.balance_usd_cents,
  };
}
