import { ApiError, errorMessage } from "../../api";
import { loadRateOverview } from "../../exchange-rate";
import { fetchInvoice, type Invoice } from "../../invoices";
import { showPrintError, showPrintView } from "../../print-chrome";
import { fetchOptionalSettings, setupPrintPage } from "../../print-page";
import { chrome, elements } from "./elements";
import { renderInvoice } from "./invoice-sheet";

const PRINT_PATH = /^\/facturas\/([^/]+)\/imprimir\/?$/;
const ID_PATTERN = /^[1-9]\d{0,9}$/;

const invoiceId = readInvoiceId(window.location.pathname);
const printPage = setupPrintPage({ sheet: elements.sheet, ...chrome });

function readInvoiceId(pathname: string): number | null {
  const raw = PRINT_PATH.exec(pathname)?.[1] ?? "";
  return ID_PATTERN.test(raw) ? Number(raw) : null;
}

function showError(title: string, message: string, canRetry: boolean): void {
  showPrintError(chrome, elements.sheet, { title, message, canRetry, toolbarTitle: "Factura" });
}

async function refreshRateIfNeeded(invoice: Invoice): Promise<void> {
  if (invoice.payment_type !== "credit" || invoice.balance_usd_cents <= 0) return;
  try {
    await loadRateOverview();
  } catch {
    return;
  }
}

function showNotFound(id: number): void {
  chrome.backLink.href = "/facturas";
  showError("Factura no encontrada", `La factura ${id} no existe.`, false);
}

async function load(): Promise<void> {
  if (invoiceId === null) {
    chrome.backLink.href = "/facturas";
    showError("Factura no encontrada", "La dirección no corresponde a ninguna factura.", false);
    return;
  }
  showPrintView(chrome, elements.sheet, "loading");
  try {
    const [invoice, business] = await Promise.all([fetchInvoice(invoiceId), fetchOptionalSettings()]);
    await refreshRateIfNeeded(invoice);
    renderInvoice(invoice, business);
    showPrintView(chrome, elements.sheet, "sheet");
    printPage.updatePageRule();
    chrome.printButton.focus();
    printPage.runAutoPrint();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) showNotFound(invoiceId);
    else showError("No se pudo cargar la factura", errorMessage(err), true);
  }
}

if (invoiceId !== null) chrome.backLink.href = `/facturas/${invoiceId}`;
chrome.retryButton.addEventListener("click", () => void load());
void load();
