import type { CartCustomer } from "../../sale-cart";
import { type CustomerPicker, mountCustomerPicker } from "./customer-picker";

let customerChosen: (customer: CartCustomer | null) => void = () => undefined;

export const customerPicker: CustomerPicker = mountCustomerPicker({
  onChange: (customer) => customerChosen(customer),
});

export function onCustomerChosen(listener: (customer: CartCustomer | null) => void): void {
  customerChosen = listener;
}
