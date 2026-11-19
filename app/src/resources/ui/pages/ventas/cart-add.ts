import { formatInteger } from "../../format";
import { dualAmountTexts } from "../../money";
import { type Product, unitsLabel } from "../../products";
import { type AddResult, addUnits, quantityInCart } from "../../sale-cart";
import { cartChanged, flashLine } from "./cart-render";
import { hideSaleAlert } from "./sale-alert";
import { currentTotals } from "./sale-totals";
import { renderResults } from "./search-results";
import { clearProductMarks, state } from "./state";
import { showStatus } from "./status";

export const ADD_MESSAGES: Record<Exclude<AddResult, "added">, (product: Product) => string> = {
  no_stock: (product) => `${product.name} no tiene stock.`,
  max_reached: (product) => `Ya están en el carrito las ${unitsLabel(product.stock)} disponibles de ${product.name}.`,
  too_many_lines: () => "La venta llegó al máximo de productos distintos. Regístrala y empieza otra.",
};

function addedStatus(product: Product): string {
  const totals = currentTotals();
  const total = dualAmountTexts(totals.total_usd_cents, totals.total_bs_cents).primary;
  return `Agregado: ${product.name} · cantidad ${formatInteger(quantityInCart(state.cart, product.id))} · total ${total}`;
}

function announceAdded(product: Product, added: number, units: number, result: AddResult): void {
  if (result === "added") {
    showStatus(addedStatus(product), "success");
    return;
  }
  showStatus(
    `Solo se agregaron ${formatInteger(added)} de ${formatInteger(units)}. ${ADD_MESSAGES[result](product)}`,
    "warning",
  );
}

export function addToCart(product: Product, units = 1): AddResult {
  const { added, result } = addUnits(state.cart, product, units);
  if (added === 0) {
    showStatus(
      ADD_MESSAGES[result as Exclude<AddResult, "added">](product),
      result === "no_stock" ? "danger" : "warning",
    );
    renderResults();
    return result;
  }
  clearProductMarks(product.id);
  hideSaleAlert();
  cartChanged();
  flashLine(product.id);
  announceAdded(product, added, units, result);
  return "added";
}
