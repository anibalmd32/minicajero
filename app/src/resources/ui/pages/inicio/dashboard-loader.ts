import { errorMessage } from "../../api";
import { type Dashboard, fetchDashboard } from "../../dashboard";
import { publishRateOverview } from "../../exchange-rate";
import { toastError } from "../../toast";
import { dashboardState } from "./dashboard-state";
import { capitalize, localDate, longDateFormat } from "./dashboard-text";
import { elements } from "./elements";
import { renderKpis } from "./kpis";
import { renderInvoices } from "./recent-invoices";
import { renderChart } from "./sales-chart";
import { renderSetup } from "./setup-steps";
import { renderDebtors } from "./top-debtors";

type ViewState = "loading" | "error" | "ready";

function showState(view: ViewState): void {
  elements.loading.classList.toggle("d-none", view !== "loading");
  elements.loadError.classList.toggle("d-none", view !== "error");
  elements.content.classList.toggle("d-none", view !== "ready");
}

/** Pinta todo el resumen con los datos dados. */
export function renderDashboard(data: Dashboard): void {
  elements.dateLabel.textContent = capitalize(longDateFormat.format(localDate(data.today)));
  renderSetup(data);
  renderKpis(data);
  renderChart(data);
  renderInvoices(data.recent_invoices);
  renderDebtors(data.top_debtors);
}

function handleLoadFailure(err: unknown): void {
  if (dashboardState.current) {
    toastError(`No se pudo actualizar el resumen. ${errorMessage(err)}`);
    return;
  }
  elements.loadErrorMessage.textContent = errorMessage(err);
  showState("error");
}

/** Consulta el resumen y lo pinta; ignora respuestas de consultas ya reemplazadas por otra más reciente. */
export async function loadDashboard(): Promise<void> {
  const request = ++dashboardState.loadRequest;
  if (!dashboardState.current) showState("loading");
  try {
    const data = await fetchDashboard();
    if (request !== dashboardState.loadRequest) return;
    dashboardState.current = data;
    dashboardState.lastLoadedAt = Date.now();
    publishRateOverview(data.exchange_rate);
    renderDashboard(data);
    showState("ready");
  } catch (err) {
    if (request === dashboardState.loadRequest) handleLoadFailure(err);
  }
}
