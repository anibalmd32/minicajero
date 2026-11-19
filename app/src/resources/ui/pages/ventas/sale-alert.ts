import { cartElements } from "./cart-elements";

export function hideSaleAlert(): void {
  cartElements.saleAlert.classList.add("d-none");
  cartElements.saleAlert.textContent = "";
}

export function showSaleAlert(message: string): void {
  cartElements.saleAlert.textContent = message;
  cartElements.saleAlert.classList.remove("d-none");
}
