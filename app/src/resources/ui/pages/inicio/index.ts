import "../../layout";
import { type ExchangeRateOverview, getLastRateOverview, RATE_OVERVIEW_EVENT } from "../../exchange-rate";
import { withBusyButton } from "../../form";
import { onMoneyChange } from "../../money";
import { loadDashboard, renderDashboard } from "./dashboard-loader";
import { dashboardState } from "./dashboard-state";
import { elements } from "./elements";
import { onRefreshRate, renderRate } from "./rate-panel";
import { onInvoiceRowClick } from "./recent-invoices";

const RELOAD_AFTER_HIDDEN_MS = 60 * 1000;

function renderLastRate(): void {
  const overview = getLastRateOverview();
  if (overview) renderRate(overview);
}

function bindRateEvents(): void {
  window.addEventListener(RATE_OVERVIEW_EVENT, (event) =>
    renderRate((event as CustomEvent<ExchangeRateOverview>).detail),
  );
  for (const connectivityEvent of ["online", "offline"]) window.addEventListener(connectivityEvent, renderLastRate);
}

function bindEvents(): void {
  elements.retryButton.addEventListener("click", () => void loadDashboard());
  elements.reloadButton.addEventListener(
    "click",
    () => void withBusyButton(elements.reloadButton, loadDashboard, "Actualizando…"),
  );
  elements.rateRefreshButton.addEventListener("click", () => void onRefreshRate());
  elements.invoicesBody.addEventListener("click", onInvoiceRowClick);
  bindRateEvents();
  document.addEventListener("visibilitychange", () => {
    const hiddenLongEnough = Date.now() - dashboardState.lastLoadedAt > RELOAD_AFTER_HIDDEN_MS;
    if (document.visibilityState === "visible" && hiddenLongEnough) void loadDashboard();
  });
  onMoneyChange(() => {
    if (dashboardState.current) renderDashboard(dashboardState.current);
  });
}

renderLastRate();
bindEvents();
void loadDashboard();
