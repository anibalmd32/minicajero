import { requireElement } from "../../dom";

/** Elementos del diálogo "Ajustar stock", buscados una sola vez al cargar. */
export const stockElements = {
  modalElement: requireElement<HTMLElement>("stock-modal"),
  form: requireElement<HTMLFormElement>("stock-form"),
  productName: requireElement<HTMLElement>("stock-product-name"),
  currentStock: requireElement<HTMLElement>("stock-current"),
  quantityInput: requireElement<HTMLInputElement>("stock_quantity"),
  quantityLabel: requireElement<HTMLElement>("stock_quantity_label"),
  result: requireElement<HTMLElement>("stock_result"),
};
