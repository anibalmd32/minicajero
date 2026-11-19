import { parseIntegerInput } from "../../format";
import { textElement } from "../../list";
import { type Product, unitsLabel } from "../../products";
import { stockElements } from "./stock-elements";
import { QUANTITY_LABELS, quantityError, resultingStock, type StockMode } from "./stock-math";

export function selectedMode(): StockMode {
  const value = stockElements.form.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value;
  return value === "remove" || value === "set" ? value : "add";
}

export function renderResult(product: Product | null): void {
  if (!product) return;
  const { quantityLabel, quantityInput, result } = stockElements;
  const mode = selectedMode();
  quantityLabel.textContent = QUANTITY_LABELS[mode];
  const quantity = parseIntegerInput(quantityInput.value);
  const error = quantity === null ? null : quantityError(mode, product.stock, quantity);
  result.classList.toggle("text-danger", error !== null);
  if (quantity === null || error !== null) {
    result.textContent = error ?? "";
    return;
  }
  result.replaceChildren(
    "Stock resultante: ",
    textElement("strong", unitsLabel(resultingStock(mode, product.stock, quantity)), "text-body"),
  );
}
