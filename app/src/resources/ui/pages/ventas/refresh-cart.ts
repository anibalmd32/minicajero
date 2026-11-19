import { ApiError } from "../../api";
import { fetchCustomer } from "../../customers";
import { fetchProduct } from "../../products";
import { updateLineProduct } from "../../sale-cart";
import { fetchSettings } from "../../settings";
import { toastError } from "../../toast";
import { renderCart } from "./cart-render";
import { lineMarks, saveCart, state } from "./state";
import { renderTotals } from "./totals-render";

export async function refreshSettings(): Promise<void> {
  try {
    state.ivaPercent = (await fetchSettings()).iva_percent;
    state.settingsFailed = false;
  } catch {
    state.settingsFailed = state.ivaPercent === null;
  }
}

async function refreshLineProduct(productId: number): Promise<void> {
  const { unavailable, serverIssues } = lineMarks;
  try {
    const product = await fetchProduct(productId);
    updateLineProduct(state.cart, product);
    serverIssues.delete(productId);
    if (product.active) unavailable.delete(productId);
    else unavailable.set(productId, "Este producto está desactivado: quítalo de la venta.");
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return;
    serverIssues.delete(productId);
    unavailable.set(productId, "Este producto ya no existe: quítalo de la venta.");
  }
}

export async function refreshCartProducts(
  ids: number[] = state.cart.lines.map((line) => line.product_id),
): Promise<void> {
  await Promise.all(ids.map(refreshLineProduct));
  saveCart();
  renderCart();
}

export async function refreshCustomer(): Promise<void> {
  const selected = state.cart.customer;
  if (!selected) return;
  try {
    const customer = await fetchCustomer(selected.id);
    if (state.cart.customer?.id !== selected.id) return;
    state.cart.customer = { ...selected, balance_usd_cents: customer.balance_usd_cents, document: customer.document };
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404) || state.cart.customer?.id !== selected.id) return;
    state.cart.customer = null;
    toastError(`El cliente ${selected.name} ya no existe; se quitó de la venta.`);
  }
  saveCart();
  renderTotals();
}
