import { cartElements } from "./cart-elements";
import { customerPicker } from "./picker-instance";

const { cartSetup, cartCard, checkoutWho } = cartElements;

export function showCartSetup(): void {
  cartSetup.scrollIntoView({ block: "nearest", behavior: "smooth" });
  customerPicker.focus();
}

export function watchCartSetup(): void {
  const observer = new IntersectionObserver(
    ([entry]) => checkoutWho.classList.toggle("d-none", entry?.isIntersecting ?? true),
    { root: cartCard, threshold: 0.6 },
  );
  observer.observe(cartSetup);
}
