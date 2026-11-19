import { ApiError, errorMessage } from "../../api";
import { formatInteger } from "../../format";
import { type CustomerStatement, fetchStatement } from "../../payments";
import { elements } from "./elements";
import { entryRow } from "./entry-row";
import { pendingRow } from "./pending-row";
import { renderHeader, renderSummary } from "./statement-header";

type PageView = "loading" | "error" | "content";

const PAGE_PATH = /^\/clientes\/([^/]+)\/?$/;
const ID_PATTERN = /^[1-9]\d{0,15}$/;

/** Cliente de la dirección actual, o `null` si no es válida. */
export const customerId = readCustomerId(window.location.pathname);
let statement: CustomerStatement | null = null;
let request = 0;

function readCustomerId(pathname: string): number | null {
  const raw = PAGE_PATH.exec(pathname)?.[1] ?? "";
  return ID_PATTERN.test(raw) ? Number(raw) : null;
}

function showView(view: PageView): void {
  elements.loading.classList.toggle("d-none", view !== "loading");
  elements.loadError.classList.toggle("d-none", view !== "error");
  elements.content.classList.toggle("d-none", view !== "content");
  for (const action of [elements.invoicesLink, elements.printLink])
    action.classList.toggle("d-none", view !== "content");
  if (view !== "content") elements.payButton.classList.add("d-none");
}

function entriesLabel(count: number): string {
  if (count === 0) return "";
  return `${formatInteger(count)} ${count === 1 ? "movimiento" : "movimientos"}, del más antiguo al más reciente`;
}

/** Último estado de cuenta cargado. */
export function currentStatement(): CustomerStatement | null {
  return statement;
}

/** Pinta el estado de cuenta completo. */
export function renderStatement(current: CustomerStatement): void {
  renderHeader(current);
  renderSummary(current);
  elements.pendingSection.classList.toggle("d-none", current.pending_invoices.length === 0);
  elements.pendingBody.replaceChildren(...current.pending_invoices.map(pendingRow));
  const hasEntries = current.entries.length > 0;
  elements.entriesEmpty.classList.toggle("d-none", hasEntries);
  elements.entriesTable.classList.toggle("d-none", !hasEntries);
  elements.entriesCount.textContent = entriesLabel(current.entries.length);
  elements.entriesBody.replaceChildren(...current.entries.map(entryRow));
}

function showError(message: string, canRetry: boolean): void {
  statement = null;
  elements.loadErrorMessage.textContent = message;
  elements.retryButton.classList.toggle("d-none", !canRetry);
  elements.titleText.textContent = "Estado de cuenta";
  elements.subtitleText.classList.add("d-none");
  showView("error");
}

/** Carga el estado de cuenta y lo pinta, o muestra el error. */
export async function load(): Promise<void> {
  if (customerId === null) {
    showError("La dirección no corresponde a ningún cliente.", false);
    return;
  }
  const current = ++request;
  if (!statement) showView("loading");
  try {
    const result = await fetchStatement(customerId);
    if (current !== request) return;
    statement = result;
    renderStatement(result);
    showView("content");
  } catch (err) {
    if (current !== request) return;
    const notFound = err instanceof ApiError && err.status === 404;
    const message = notFound
      ? `El cliente ${customerId} no existe.`
      : `No se pudo cargar el estado de cuenta. ${errorMessage(err)}`;
    showError(message, !notFound);
  }
}
