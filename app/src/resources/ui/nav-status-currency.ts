import { errorMessage } from "./api";
import { applyDisplayCurrency, getDisplayCurrency } from "./money";
import { type NavStatusParts, renderCurrency } from "./nav-status-view";
import { type DisplayCurrency, fetchSettings, saveSettings } from "./settings";
import { toastError } from "./toast";

let currencyRequest = 0;
let savedCurrency: DisplayCurrency = getDisplayCurrency();

export async function changeCurrency(parts: NavStatusParts, currency: DisplayCurrency): Promise<void> {
  const request = ++currencyRequest;
  applyDisplayCurrency(currency);
  try {
    savedCurrency = (await saveSettings({ display_currency: currency })).display_currency;
    if (request === currencyRequest) applyDisplayCurrency(savedCurrency);
  } catch (err) {
    if (request !== currencyRequest) return;
    applyDisplayCurrency(savedCurrency);
    renderCurrency(parts, savedCurrency);
    toastError(`No se pudo guardar la moneda principal. ${errorMessage(err)}`);
  }
}

export async function syncCurrencyFromServer(): Promise<void> {
  const request = currencyRequest;
  try {
    const { display_currency } = await fetchSettings();
    if (request !== currencyRequest) return;
    savedCurrency = display_currency;
    applyDisplayCurrency(display_currency);
  } catch {
    return;
  }
}
