import { ApiError, errorMessage } from "../../api";
import { fetchInvoice } from "../../invoices";
import { detailElements as e } from "./detail-elements";
import { setTitle } from "./detail-header";
import { renderInvoice } from "./detail-render";
import { detailState, showView } from "./detail-state";

function loadErrorText(err: unknown, id: number): string {
  return err instanceof ApiError && err.status === 404
    ? `La factura ${id} no existe.`
    : `No se pudo cargar la factura. ${errorMessage(err)}`;
}

/** Carga la factura `id` y la pinta, o muestra el error. */
export async function load(id: number): Promise<void> {
  const request = ++detailState.session;
  detailState.invoice = null;
  setTitle(null, id);
  showView("loading");
  try {
    const result = await fetchInvoice(id);
    if (request !== detailState.session) return;
    detailState.invoice = result;
    renderInvoice(result);
    showView("detail");
  } catch (err) {
    if (request !== detailState.session) return;
    e.loadErrorMessage.textContent = loadErrorText(err, id);
    e.retryButton.classList.toggle("d-none", err instanceof ApiError && err.status === 404);
    showView("error");
  }
}
