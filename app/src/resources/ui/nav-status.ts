import {
  type ExchangeRateOverview,
  getLastRateOverview,
  loadRateOverview,
  RATE_OVERVIEW_EVENT,
  refreshRate,
} from "./exchange-rate";
import { CURRENCY_CHANGE_EVENT, getCurrentRate, getDisplayCurrency } from "./money";
import { changeCurrency, syncCurrencyFromServer } from "./nav-status-currency";
import {
  LOADING_VIEW,
  type NavStatusParts,
  renderCurrency,
  renderIndicator,
  renderOverview,
  renderSkeleton,
  UNREACHABLE_VIEW,
} from "./nav-status-view";

export { RATE_SETTINGS_URL } from "./nav-status-view";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const RESUME_REFRESH_AFTER_MS = 60 * 1000;
const SYNCING_RECHECK_MS = 3000;

let lastLoadedAt = 0;

async function loadOverview(parts: NavStatusParts, task: () => Promise<ExchangeRateOverview>): Promise<void> {
  try {
    const overview = await task();
    lastLoadedAt = Date.now();
    if (overview.status.syncing)
      window.setTimeout(() => void loadOverview(parts, loadRateOverview), SYNCING_RECHECK_MS);
  } catch {
    if (!getLastRateOverview()) renderIndicator(parts, UNREACHABLE_VIEW, getCurrentRate());
  }
}

function bindCurrencyInputs(parts: NavStatusParts): void {
  for (const input of parts.currencyInputs) {
    input.addEventListener("change", () => {
      if (input.checked && (input.value === "USD" || input.value === "VES")) void changeCurrency(parts, input.value);
    });
  }
  window.addEventListener(CURRENCY_CHANGE_EVENT, () => renderCurrency(parts, getDisplayCurrency()));
}

function bindRateEvents(parts: NavStatusParts): void {
  window.addEventListener(RATE_OVERVIEW_EVENT, (event) => {
    renderOverview(parts, (event as CustomEvent<ExchangeRateOverview>).detail);
  });
  window.addEventListener("online", () => void loadOverview(parts, refreshRate));
  window.addEventListener("offline", () => {
    const overview = getLastRateOverview();
    if (overview) renderOverview(parts, overview);
  });
}

function bindRefreshTriggers(parts: NavStatusParts): void {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastLoadedAt > RESUME_REFRESH_AFTER_MS) {
      void loadOverview(parts, loadRateOverview);
    }
  });
  window.setInterval(() => void loadOverview(parts, loadRateOverview), POLL_INTERVAL_MS);
}

/**
 * Pinta en `slot` el indicador de tasa (enlace a la gestión de la tasa) y el conmutador USD/Bs.
 * Consulta el estado al montar, cada 5 minutos y al volver a la pestaña; al recuperar la conexión
 * fuerza una sincronización. Si no hay tasa muestra un aviso global bajo la navbar.
 */
export function mountNavStatus(slot: HTMLElement): void {
  if (slot.childElementCount > 0) return;
  const parts = renderSkeleton(slot);
  renderIndicator(parts, LOADING_VIEW, getCurrentRate());
  renderCurrency(parts, getDisplayCurrency());
  bindCurrencyInputs(parts);
  bindRateEvents(parts);
  bindRefreshTriggers(parts);
  void loadOverview(parts, loadRateOverview);
  void syncCurrencyFromServer();
}
