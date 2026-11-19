import { type ExchangeRateOverview, getLastRateOverview, RATE_OVERVIEW_EVENT } from "../../exchange-rate";
import { bindForm } from "../../form";
import { elements } from "./elements";
import { loadHistory, moveHistoryPage } from "./history-table";
import { onManualRate } from "./manual-rate";
import { onBackToAuto, onRefresh } from "./rate-actions";
import { renderOverview } from "./rate-overview";

function isRateSectionLink(target: EventTarget | null): boolean {
  const link = target instanceof Element ? target.closest("a[href]") : null;
  return (
    link instanceof HTMLAnchorElement &&
    link.pathname === window.location.pathname &&
    link.hash === `#${elements.section.id}`
  );
}

/** Si la URL pide la sección de tasa (`/configuracion#tasa`), la muestra y enfoca la tasa manual. Devuelve si lo hizo. */
export function revealRateSectionIfRequested(): boolean {
  if (window.location.hash !== `#${elements.section.id}`) return false;
  elements.section.scrollIntoView({ block: "start" });
  elements.manualRateInput.focus({ preventScroll: true });
  return true;
}

function bindRateEvents(): void {
  window.addEventListener(RATE_OVERVIEW_EVENT, (event) => {
    renderOverview((event as CustomEvent<ExchangeRateOverview>).detail);
    void loadHistory();
  });
  window.addEventListener("offline", () => {
    const overview = getLastRateOverview();
    if (overview) renderOverview(overview);
  });
}

function bindSectionLinks(): void {
  window.addEventListener("hashchange", () => void revealRateSectionIfRequested());
  document.addEventListener("click", (event) => {
    if (isRateSectionLink(event.target)) window.setTimeout(revealRateSectionIfRequested);
  });
}

function bindEvents(): void {
  bindRateEvents();
  elements.refreshButton.addEventListener("click", () => void onRefresh());
  elements.autoButton.addEventListener("click", () => void onBackToAuto());
  elements.historyPrev.addEventListener("click", () => moveHistoryPage(-1));
  elements.historyNext.addEventListener("click", () => moveHistoryPage(1));
  elements.historyRetry.addEventListener("click", () => void loadHistory());
  bindForm(elements.manualForm, (values) => onManualRate(values.rate ?? ""));
  bindSectionLinks();
}

/**
 * Activa la sección de tasa de la configuración: tasa vigente y estado, actualización forzada,
 * tasa manual, vuelta al modo automático e historial paginado.
 */
export function mountRateSettings(): void {
  bindEvents();
  const overview = getLastRateOverview();
  if (overview) renderOverview(overview);
  void loadHistory();
}
