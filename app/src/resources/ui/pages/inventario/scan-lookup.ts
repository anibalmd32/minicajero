import { ApiError } from "../../api";
import { formatInteger } from "../../format";
import { visibleRowAction } from "../../list";
import type { ScanReply } from "../../phone-events";
import { fetchProductByCode, type Product } from "../../products";
import { showToast } from "../../toast";
import { elements } from "./elements";
import { state } from "./inventory-state";
import { applyFilters, syncFilterInputs } from "./product-list";
import { openProductModal } from "./product-modal";
import { flash } from "./scan-flash";
import { openStockDialog } from "./stock-dialog";

const SCAN_TOAST_MS = 6000;
const SCAN_TOAST_KEY = "phone-scan";

function highlightProduct(product: Product): void {
  const row = elements.tableBody.querySelector<HTMLTableRowElement>(`tr[data-id="${product.id}"]`);
  if (!row) return;
  flash(row);
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  visibleRowAction(row, "stock")?.focus({ preventScroll: true });
}

async function showScannedProduct(product: Product): Promise<ScanReply> {
  elements.searchInput.value = product.code ?? "";
  state.filter = "all";
  syncFilterInputs();
  await applyFilters();
  highlightProduct(product);
  showToast(`Encontrado: ${product.name} · stock ${formatInteger(product.stock)}`, "info", {
    delayMs: SCAN_TOAST_MS,
    key: SCAN_TOAST_KEY,
    action: { label: "Ajustar stock", onClick: () => openStockDialog(product) },
  });
  return { status: "found", message: `Producto encontrado: ${product.name}` };
}

/** Busca el código escaneado: si existe lo resalta; si no, abre "Nuevo producto" con el código puesto. */
export async function lookUpScannedCode(code: string, signal: AbortSignal): Promise<ScanReply> {
  try {
    const product = await fetchProductByCode(code);
    signal.throwIfAborted();
    return await showScannedProduct(product);
  } catch (err) {
    signal.throwIfAborted();
    if (!(err instanceof ApiError && err.status === 404)) {
      return { status: "error", message: "No se pudo buscar el producto. Intenta de nuevo." };
    }
  }
  openProductModal(undefined, code.toUpperCase());
  return { status: "created", message: "Código nuevo: complétalo en la computadora" };
}
