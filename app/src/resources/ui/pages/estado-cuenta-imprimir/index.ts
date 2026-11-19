import { ApiError, errorMessage } from "../../api";
import { loadRateOverview } from "../../exchange-rate";
import { customerStatementUrl, fetchStatement } from "../../payments";
import { showPrintError, showPrintView } from "../../print-chrome";
import { fetchOptionalSettings, setupPrintPage } from "../../print-page";
import { chrome, elements } from "./elements";
import { renderStatement } from "./statement-sheet";

const PRINT_PATH = /^\/clientes\/([^/]+)\/imprimir\/?$/;
const ID_PATTERN = /^[1-9]\d{0,15}$/;

const customerId = readCustomerId(window.location.pathname);
const printPage = setupPrintPage({ sheet: elements.sheet, ...chrome });

function readCustomerId(pathname: string): number | null {
  const raw = PRINT_PATH.exec(pathname)?.[1] ?? "";
  return ID_PATTERN.test(raw) ? Number(raw) : null;
}

function showError(title: string, message: string, canRetry: boolean): void {
  showPrintError(chrome, elements.sheet, { title, message, canRetry, toolbarTitle: "Estado de cuenta" });
}

async function refreshRate(): Promise<void> {
  try {
    await loadRateOverview();
  } catch {
    return;
  }
}

function showNotFound(id: number): void {
  chrome.backLink.href = "/clientes";
  showError("Cliente no encontrado", `El cliente ${id} no existe.`, false);
}

async function load(): Promise<void> {
  if (customerId === null) {
    showError("Cliente no encontrado", "La dirección no corresponde a ningún cliente.", false);
    return;
  }
  showPrintView(chrome, elements.sheet, "loading");
  try {
    const [statement, business] = await Promise.all([
      fetchStatement(customerId),
      fetchOptionalSettings(),
      refreshRate(),
    ]);
    renderStatement(statement, business);
    showPrintView(chrome, elements.sheet, "sheet");
    printPage.updatePageRule();
    chrome.printButton.focus();
    printPage.runAutoPrint();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) showNotFound(customerId);
    else showError("No se pudo cargar el estado de cuenta", errorMessage(err), true);
  }
}

if (customerId !== null) chrome.backLink.href = customerStatementUrl(customerId);
chrome.retryButton.addEventListener("click", () => void load());
void load();
