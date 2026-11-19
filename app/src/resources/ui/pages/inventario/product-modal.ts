import { ApiError, type FieldErrors } from "../../api";
import { Modal } from "../../bootstrap";
import { bindForm, clearFieldErrors, type FormValues, fillForm } from "../../form";
import {
  formatCentsInput,
  isAmbiguousThousands,
  numberForRequest,
  parseDecimalInput,
  parseIntegerInput,
} from "../../format";
import {
  createProduct,
  type Product,
  type ProductInput,
  productLabel,
  unitsLabel,
  updateProduct,
} from "../../products";
import { toastSuccess } from "../../toast";
import { elements } from "./elements";
import { rememberFocus, restoreRememberedFocus } from "./focus-memory";
import { session } from "./inventory-state";
import { PRICE_DECIMALS_HINT, previewMessage, renderPricePreview } from "./price-preview";
import { flash } from "./scan-flash";

const modal = Modal.getOrCreateInstance(elements.productModalElement);

function fillProduct(product: Product): void {
  fillForm(elements.productForm, {
    name: product.name,
    code: product.code ?? "",
    price_usd: formatCentsInput(product.price_usd_cents),
    active: product.active,
  });
  elements.currentStockValue.textContent = unitsLabel(product.stock);
}

/** Abre el modal para registrar un producto nuevo o editar el indicado; `scannedCode` rellena el código. */
export function openProductModal(product?: Product, scannedCode?: string): void {
  session.modalSession += 1;
  session.editingProduct = product ?? null;
  rememberFocus();
  elements.productModalTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  elements.productForm.reset();
  clearFieldErrors(elements.productForm);
  elements.initialStockGroup.classList.toggle("d-none", product !== undefined);
  elements.currentStockGroup.classList.toggle("d-none", product === undefined);
  if (product) fillProduct(product);
  if (scannedCode !== undefined) {
    elements.codeInput.value = scannedCode;
    flash(elements.codeInput);
  }
  renderPricePreview();
  modal.show();
}

function invalidForm(message: string, details: FieldErrors): ApiError {
  return new ApiError(400, message, details);
}

function toProductInput(values: FormValues, isNew: boolean): ProductInput {
  const priceText = values.price_usd ?? "";
  if (isAmbiguousThousands(priceText)) {
    previewMessage("");
    throw invalidForm("Revisa los datos del producto", { price_usd: PRICE_DECIMALS_HINT });
  }
  const input: ProductInput = {
    code: values.code ?? "",
    name: values.name ?? "",
    price_usd: numberForRequest(parseDecimalInput(priceText), priceText),
    active: values.active === "1",
  };
  if (isNew) {
    const stockText = values.stock ?? "";
    input.stock = numberForRequest(parseIntegerInput(stockText), stockText);
  }
  return input;
}

async function saveProduct(values: FormValues, onSaved: () => Promise<void>): Promise<void> {
  const editing = session.editingProduct;
  const modalSession = session.modalSession;
  const input = toProductInput(values, editing === null);
  const saved = editing === null ? await createProduct(input) : await updateProduct(editing.id, input);
  if (modalSession === session.modalSession) modal.hide();
  toastSuccess(`Producto ${productLabel(saved)} ${editing === null ? "registrado" : "actualizado"}`);
  await onSaved();
}

/** Conecta el formulario del modal; `onSaved` recarga el listado tras guardar. */
export function bindProductModal(onSaved: () => Promise<void>): void {
  elements.priceInput.addEventListener("input", renderPricePreview);
  elements.productModalElement.addEventListener("shown.bs.modal", () => elements.nameInput.focus());
  elements.productModalElement.addEventListener("hidden.bs.modal", () => {
    clearFieldErrors(elements.productForm);
    session.editingProduct = null;
    restoreRememberedFocus();
  });
  bindForm(elements.productForm, (values) => saveProduct(values, onSaved));
}
