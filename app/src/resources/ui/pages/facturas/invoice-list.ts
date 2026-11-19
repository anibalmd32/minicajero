import { errorMessage } from "../../api";
import { formatInteger } from "../../format";
import { fetchInvoices, type InvoicePage } from "../../invoices";
import { lastPageOffset, pageCountLabel, textElement } from "../../list";
import { formatDual, formatDualSnapshot } from "../../money";
import { elements } from "./elements";
import { invoiceRow } from "./invoice-row";
import { hasFilters, PAGE_SIZE, state } from "./list-state";

type ViewState = "loading" | "error" | "empty" | "ready";

let currentPage: InvoicePage | null = null;
let listRequest = 0;

function showState(view: ViewState): void {
  elements.loading.classList.toggle("d-none", view !== "loading");
  elements.loadError.classList.toggle("d-none", view !== "error");
  elements.empty.classList.toggle("d-none", view !== "empty");
  elements.list.classList.toggle("d-none", view !== "ready");
}

function emptyMessage(): { title: string; text: string } {
  if (!hasFilters()) {
    return {
      title: "Aún no hay facturas",
      text: "Las facturas aparecen aquí a medida que registras ventas en el punto de venta.",
    };
  }
  return {
    title: "Ninguna factura coincide",
    text: state.q
      ? `No se encontraron facturas para «${state.q}» con los filtros elegidos. Prueba con otro número, nombre o documento.`
      : "No hay facturas con los filtros elegidos. Prueba con otro estado o rango de fechas.",
  };
}

function renderEmpty(): void {
  const filtered = hasFilters();
  elements.emptySale.classList.toggle("d-none", filtered);
  elements.emptyClear.classList.toggle("d-none", !filtered);
  const message = emptyMessage();
  elements.emptyTitle.textContent = message.title;
  elements.emptyText.textContent = message.text;
}

function renderTotals(page: InvoicePage): void {
  const { totals } = page;
  const active = totals.invoices === 1 ? "1 factura" : `${formatInteger(totals.invoices)} facturas`;
  const voided = totals.voided === 1 ? "1 anulada" : `${formatInteger(totals.voided)} anuladas`;
  if (totals.invoices === 0 && totals.voided > 0)
    elements.totalsCount.replaceChildren(textElement("span", voided, "text-nowrap"));
  else {
    elements.totalsCount.replaceChildren(
      textElement("span", active, "text-nowrap"),
      ...(totals.voided > 0 ? [textElement("small", ` + ${voided}`, "text-body-secondary text-nowrap")] : []),
    );
  }
  elements.totalsAmount.innerHTML = formatDualSnapshot(totals.total_usd_cents, totals.total_bs_cents);
  elements.totalsBalance.innerHTML = formatDual(totals.balance_usd_cents);
  elements.totalsBalance.classList.toggle("text-danger", totals.balance_usd_cents > 0);
}

function renderPage(page: InvoicePage): void {
  renderTotals(page);
  elements.tableBody.replaceChildren(...page.items.map(invoiceRow));
  elements.countText.textContent = pageCountLabel(page, "factura", "facturas");
  elements.prevButton.disabled = page.offset === 0;
  elements.nextButton.disabled = page.offset + page.items.length >= page.total;
  elements.prevButton.parentElement?.classList.toggle("d-none", page.total <= PAGE_SIZE);
}

/** Vuelve a pintar la página cargada (p. ej. al cambiar la moneda principal). */
export function rerenderPage(): void {
  if (currentPage && currentPage.total > 0) renderPage(currentPage);
}

/** Carga la página actual del listado y la pinta, o muestra el estado vacío o el error. */
export async function loadInvoices(): Promise<void> {
  const request = ++listRequest;
  if (elements.list.classList.contains("d-none")) showState("loading");
  elements.list.setAttribute("aria-busy", "true");
  try {
    const page = await fetchInvoices({ ...state, limit: PAGE_SIZE });
    if (request !== listRequest) return;
    if (page.total > 0 && page.items.length === 0 && state.offset > 0) {
      state.offset = lastPageOffset(page.total, PAGE_SIZE);
      return loadInvoices();
    }
    currentPage = page;
    if (page.total === 0) {
      renderEmpty();
      showState("empty");
      return;
    }
    renderPage(page);
    showState("ready");
  } catch (err) {
    if (request !== listRequest) return;
    elements.loadErrorMessage.textContent = errorMessage(err);
    showState("error");
  } finally {
    if (request === listRequest) elements.list.removeAttribute("aria-busy");
  }
}

/** Salta a la página que empieza en `offset`. */
export function goToPage(offset: number): void {
  state.offset = Math.max(0, offset);
  void loadInvoices();
}
