import { usdToBs } from "../../lib/money";
import { formatBs, formatUsd } from "./format";
import type { DisplayCurrency } from "./settings";

/** Evento de `window` emitido al cambiar la moneda principal; `detail` es la nueva `DisplayCurrency`. */
export const CURRENCY_CHANGE_EVENT = "currencychange";

/** Evento de `window` emitido al cambiar la tasa vigente; `detail` es la tasa (Bs por USD) o `null`. */
export const RATE_CHANGE_EVENT = "ratechange";

const CURRENCY_STORAGE_KEY = "minicajero.display-currency";
const RATE_STORAGE_KEY = "minicajero.current-rate";

const MISSING_BS = "Bs —";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return value === "USD" || value === "VES";
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function loadCachedCurrency(): DisplayCurrency {
  const stored = readStorage(CURRENCY_STORAGE_KEY);
  return isDisplayCurrency(stored) ? stored : "USD";
}

function loadCachedRate(): number | null {
  const stored = Number(readStorage(RATE_STORAGE_KEY) ?? Number.NaN);
  return isValidRate(stored) ? stored : null;
}

let displayCurrency: DisplayCurrency = loadCachedCurrency();
let currentRate: number | null = loadCachedRate();

/** Moneda principal de visualización (cacheada en `localStorage` para pintar sin esperar a la API). */
export function getDisplayCurrency(): DisplayCurrency {
  return displayCurrency;
}

/** Cambia la moneda principal en esta sesión y en la caché local, y emite `currencychange` si cambió. No llama a la API. */
export function applyDisplayCurrency(currency: DisplayCurrency): void {
  writeStorage(CURRENCY_STORAGE_KEY, currency);
  if (currency === displayCurrency) return;
  displayCurrency = currency;
  window.dispatchEvent(new CustomEvent<DisplayCurrency>(CURRENCY_CHANGE_EVENT, { detail: currency }));
}

/** Tasa vigente (Bs por USD) conocida por el cliente, o `null` si no hay ninguna. */
export function getCurrentRate(): number | null {
  return currentRate;
}

/** Actualiza la tasa vigente y su caché local, y emite `ratechange` si cambió. */
export function applyCurrentRate(rate: number | null): void {
  const next = isValidRate(rate) ? rate : null;
  writeStorage(RATE_STORAGE_KEY, next === null ? null : String(next));
  if (next === currentRate) return;
  currentRate = next;
  window.dispatchEvent(new CustomEvent<number | null>(RATE_CHANGE_EVENT, { detail: next }));
}

/** Ejecuta `listener` cada vez que cambie la moneda principal o la tasa (para re-renderizar montos). Devuelve la función para dejar de escuchar. */
export function onMoneyChange(listener: () => void): () => void {
  window.addEventListener(CURRENCY_CHANGE_EVENT, listener);
  window.addEventListener(RATE_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(CURRENCY_CHANGE_EVENT, listener);
    window.removeEventListener(RATE_CHANGE_EVENT, listener);
  };
}

/** Céntimos Bs equivalentes a `usdCents` con la tasa vigente, o `null` si no hay tasa. */
export function usdCentsToBs(usdCents: number): number | null {
  return currentRate === null ? null : usdToBs(usdCents, currentRate);
}

/** Textos de ambos montos ordenados según la moneda principal; sin Bs (`null`) el principal es siempre el USD. */
export function dualAmountTexts(usdCents: number, bsCents: number | null): { primary: string; secondary: string } {
  const usd = formatUsd(usdCents);
  const bs = bsCents === null ? MISSING_BS : formatBs(bsCents);
  return displayCurrency === "VES" && bsCents !== null
    ? { primary: bs, secondary: usd }
    : { primary: usd, secondary: bs };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function renderDual(primary: string, secondary: string): string {
  return `<span class="text-nowrap">${escapeHtml(primary)}</span> <small class="text-body-secondary text-nowrap">(${escapeHtml(secondary)})</small>`;
}

function renderAmounts(usdText: string, bsText: string | null): string {
  if (bsText === null) return renderDual(usdText, MISSING_BS);
  return displayCurrency === "VES" ? renderDual(bsText, usdText) : renderDual(usdText, bsText);
}

/**
 * HTML con ambos montos de un importe en USD: el de la moneda principal y el otro, pequeño y entre
 * paréntesis (`$ 10,00 (Bs 365,03)`). El Bs se calcula con la tasa vigente; sin tasa muestra `Bs —`.
 */
export function formatDual(usdCents: number): string {
  const bsCents = usdCentsToBs(usdCents);
  return renderAmounts(formatUsd(usdCents), bsCents === null ? null : formatBs(bsCents));
}

window.addEventListener("storage", (event) => {
  if (event.key === CURRENCY_STORAGE_KEY && isDisplayCurrency(event.newValue)) applyDisplayCurrency(event.newValue);
});

/** Igual que `formatDual` pero con el monto en Bs ya fijado (snapshot de una factura); no usa la tasa vigente. */
export function formatDualSnapshot(usdCents: number, bsCents: number): string {
  return renderAmounts(formatUsd(usdCents), formatBs(bsCents));
}
