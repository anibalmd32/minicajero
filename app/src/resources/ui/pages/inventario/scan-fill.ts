import { clearFieldErrors, showFieldErrors } from "../../form";
import type { ScanReply } from "../../phone-events";
import { fetchProductByCode, type Product, productLabel } from "../../products";
import { elements } from "./elements";
import { session } from "./inventory-state";
import { flash } from "./scan-flash";

function nextEmptyField(): HTMLElement {
  const { nameInput, priceInput, stockInput, saveButton } = elements;
  const candidates = [nameInput, priceInput, ...(session.editingProduct === null ? [stockInput] : [])];
  return candidates.find((input) => input.value.trim() === "") ?? saveButton;
}

async function codeOwner(code: string): Promise<Product | null> {
  try {
    return await fetchProductByCode(code);
  } catch {
    return null;
  }
}

/** Rellena el código en el modal de producto abierto y avisa si ya pertenece a otro producto. */
export async function fillScannedCode(code: string, signal: AbortSignal): Promise<ScanReply> {
  const modalSession = session.modalSession;
  const owner = await codeOwner(code);
  signal.throwIfAborted();
  if (modalSession !== session.modalSession || !elements.productModalElement.classList.contains("show"))
    return { status: "no-target", message: "Se cerró el producto en la computadora" };
  elements.codeInput.value = code.toUpperCase();
  clearFieldErrors(elements.productForm, "code");
  flash(elements.codeInput);
  if (owner && owner.id !== session.editingProduct?.id) {
    showFieldErrors(elements.productForm, { code: `Ya lo usa ${productLabel(owner)}` });
    return { status: "error", message: `Ese código ya es de ${owner.name}` };
  }
  nextEmptyField().focus();
  return { status: "filled", message: "Código listo en la computadora" };
}
