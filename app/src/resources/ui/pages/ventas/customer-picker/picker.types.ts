import type { Customer } from "../../../customers";
import type { PaymentType } from "../../../invoices";
import type { CartCustomer } from "../../../sale-cart";

/** Selector de cliente de la venta. */
export interface CustomerPicker {
  /** Pinta el cliente elegido y el aviso según la condición de pago. */
  render(customer: CartCustomer | null, paymentType: PaymentType): void;
  /** Lleva el foco al selector (buscador o botón "Cambiar"). */
  focus(): void;
}

/** Acciones de la página que usa el selector. */
export interface CustomerPickerHooks {
  onChange(customer: CartCustomer | null): void;
}

export type PickerOption = { kind: "walk-in" } | { kind: "customer"; customer: Customer } | { kind: "create" };
