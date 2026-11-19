import type { PcScanMessage } from "../../../../modules/phone/phone.protocol";
import { ApiError } from "../../api";
import { formatInteger } from "../../format";
import { closePhoneModal, otherOpenModal } from "../../phone-connect";
import type { ScanReply } from "../../phone-events";
import { fetchProductByCode, type Product } from "../../products";
import { quantityInCart } from "../../sale-cart";
import { showToast } from "../../toast";
import { ADD_MESSAGES, addToCart } from "./cart-add";
import { SCAN_TOAST_KEY, SCAN_TOAST_MS } from "./constants";
import { modalElements, saleModal } from "./modal-elements";
import { state } from "./state";
import { showStatus } from "./status";

function scanReply(status: ScanReply["status"], message: string): ScanReply {
  showToast(message, "warning", { delayMs: SCAN_TOAST_MS, key: SCAN_TOAST_KEY });
  return { status, message };
}

async function findScannedProduct(code: string): Promise<Product | ScanReply> {
  try {
    return await fetchProductByCode(code);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const message = `No hay ningún producto con el código ${code}`;
      showStatus(message, "danger");
      return scanReply("not-found", message);
    }
    return { status: "error", message: "No se pudo buscar el producto. Intenta de nuevo." };
  }
}

function refreshResult(product: Product): void {
  const index = state.results.findIndex((result) => result.id === product.id);
  if (index >= 0) state.results[index] = product;
}

function addScannedProduct(product: Product): ScanReply {
  refreshResult(product);
  if (!product.active) {
    const message = `${product.name} está desactivado`;
    showStatus(`${message}: actívalo en el inventario para venderlo.`, "danger");
    return scanReply("not-found", message);
  }
  const result = addToCart(product);
  const inCart = formatInteger(quantityInCart(state.cart, product.id));
  if (result === "added") {
    showToast(`Agregado: ${product.name}`, "success", { delayMs: SCAN_TOAST_MS, key: SCAN_TOAST_KEY });
    return { status: "added", message: `${product.name} · ${inCart} en el carrito` };
  }
  if (result === "no_stock") return scanReply("no-stock", `Sin stock: ${product.name}`);
  if (result === "max_reached") return scanReply("no-stock", `No hay más ${product.name}: ${inCart} en el carrito`);
  return scanReply("error", ADD_MESSAGES.too_many_lines(product));
}

export async function onPhoneScan(scan: PcScanMessage, signal: AbortSignal): Promise<ScanReply> {
  await closePhoneModal();
  signal.throwIfAborted();
  if (modalElements.saleModalElement.classList.contains("show")) {
    if (!state.saleDone) return { status: "no-target", message: "Termina el cobro en la computadora" };
    saleModal.hide();
  } else if (otherOpenModal()) {
    return { status: "no-target", message: "Termina lo que estás haciendo en la computadora" };
  }
  const found = await findScannedProduct(scan.code);
  signal.throwIfAborted();
  return "status" in found ? found : addScannedProduct(found);
}
