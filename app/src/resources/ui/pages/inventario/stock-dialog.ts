import type { Product } from "../../products";
import { rememberFocus, restoreRememberedFocus } from "./focus-memory";
import { loadProducts } from "./product-list";
import { mountStockAdjustment } from "./stock-adjustment";

const stockDialog = mountStockAdjustment({ onSaved: loadProducts, onHidden: restoreRememberedFocus });

export function openStockDialog(product: Product): void {
  rememberFocus();
  stockDialog.open(product);
}
