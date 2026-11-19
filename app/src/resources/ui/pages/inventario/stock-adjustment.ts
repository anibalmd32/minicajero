import { ApiError } from "../../api";
import { Modal } from "../../bootstrap";
import { bindForm, clearFieldErrors, type FormValues } from "../../form";
import { formatInteger, parseIntegerInput } from "../../format";
import { adjustProductStock, type Product, productLabel, unitsLabel } from "../../products";
import { toastSuccess } from "../../toast";
import { stockElements } from "./stock-elements";
import { quantityError, toAdjustment, withQuantityField } from "./stock-math";
import { renderResult, selectedMode } from "./stock-result";

/** Diálogo "Ajustar stock" de un producto. */
export interface StockAdjustmentDialog {
  open(product: Product): void;
}

/** Acciones de la página que usa el diálogo. */
export interface StockAdjustmentHooks {
  /** Tras guardar un ajuste (por ejemplo, recargar el listado). */
  onSaved: () => Promise<void>;
  /** Al cerrarse el diálogo (por ejemplo, devolver el foco). */
  onHidden: () => void;
}

const modal = Modal.getOrCreateInstance(stockElements.modalElement);
let product: Product | null = null;
let session = 0;

function validatedQuantity(target: Product, values: FormValues): number {
  const quantity = parseIntegerInput(values.quantity ?? "");
  const error = quantityError(selectedMode(), target.stock, quantity);
  if (error !== null || quantity === null) {
    stockElements.result.textContent = "";
    throw new ApiError(400, "Revisa el ajuste de stock", { quantity: error ?? "Este campo es obligatorio" });
  }
  return quantity;
}

async function sendAdjustment(target: Product, values: FormValues): Promise<Product> {
  const quantity = validatedQuantity(target, values);
  try {
    return await adjustProductStock(target.id, toAdjustment(selectedMode(), quantity, values.reason ?? ""));
  } catch (err) {
    throw withQuantityField(err);
  }
}

async function save(values: FormValues, onSaved: () => Promise<void>): Promise<void> {
  const target = product;
  if (!target) return;
  const current = session;
  const saved = await sendAdjustment(target, values);
  if (current === session) modal.hide();
  toastSuccess(`Stock de ${productLabel(saved)}: ${formatInteger(target.stock)} → ${unitsLabel(saved.stock)}`);
  await onSaved();
}

function onModeChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement) || event.target.name !== "mode") return;
  clearFieldErrors(stockElements.form, "quantity");
  renderResult(product);
  stockElements.quantityInput.focus();
}

function bindDialog(hooks: StockAdjustmentHooks): void {
  const { modalElement, form, quantityInput } = stockElements;
  form.addEventListener("input", () => renderResult(product));
  form.addEventListener("change", onModeChange);
  modalElement.addEventListener("shown.bs.modal", () => quantityInput.focus());
  modalElement.addEventListener("hidden.bs.modal", () => {
    clearFieldErrors(form);
    product = null;
    hooks.onHidden();
  });
  bindForm(form, (values) => save(values, hooks.onSaved));
}

function openFor(target: Product): void {
  session += 1;
  product = target;
  stockElements.form.reset();
  clearFieldErrors(stockElements.form);
  stockElements.productName.textContent = productLabel(target);
  stockElements.currentStock.textContent = unitsLabel(target.stock);
  renderResult(product);
  modal.show();
}

/**
 * Conecta el modal `#stock-modal`: sumar, restar o fijar el stock con motivo opcional,
 * con vista previa del stock resultante y validación antes de enviar.
 */
export function mountStockAdjustment(hooks: StockAdjustmentHooks): StockAdjustmentDialog {
  bindDialog(hooks);
  return { open: openFor };
}
