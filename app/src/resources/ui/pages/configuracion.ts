import "../layout";
import { errorMessage } from "../api";
import { requireElement } from "../dom";
import { bindForm, type FormValues, fillForm } from "../form";
import { formatDecimalInput, numberForRequest, parseDecimalInput } from "../format";
import { applyDisplayCurrency, CURRENCY_CHANGE_EVENT, getDisplayCurrency } from "../money";
import { type BusinessSettings, fetchSettings, type SettingsChanges, saveSettings } from "../settings";
import { toastSuccess } from "../toast";
import { mountAccessSettings } from "./access-settings";
import { mountAppSettings } from "./app-settings";
import { mountBackupSettings } from "./backup-settings";
import { mountRateSettings, revealRateSectionIfRequested } from "./rate-settings";

const form = requireElement<HTMLFormElement>("settings-form");
const loading = requireElement<HTMLElement>("settings-loading");
const loadError = requireElement<HTMLElement>("settings-load-error");
const loadErrorMessage = requireElement<HTMLElement>("settings-load-error-message");
const retryButton = requireElement<HTMLButtonElement>("settings-retry");

type ViewState = "loading" | "error" | "ready";

function showState(state: ViewState): void {
  loading.classList.toggle("d-none", state !== "loading");
  loadError.classList.toggle("d-none", state !== "error");
  form.classList.toggle("d-none", state !== "ready");
}

function renderSettings(settings: BusinessSettings): void {
  fillForm(form, { ...settings, iva_percent: formatDecimalInput(settings.iva_percent) });
}

function ivaForRequest(text: string): number | string | null {
  return numberForRequest(parseDecimalInput(text), text);
}

function toChanges(values: FormValues): SettingsChanges {
  return {
    business_name: values.business_name ?? "",
    business_rif: values.business_rif ?? "",
    business_address: values.business_address ?? "",
    business_phone: values.business_phone ?? "",
    iva_percent: ivaForRequest(values.iva_percent ?? ""),
    display_currency: values.display_currency ?? "",
  };
}

function focusFirstField(): void {
  form.querySelector<HTMLInputElement>("input, textarea, select")?.focus({ preventScroll: true });
}

async function loadSettings(): Promise<void> {
  showState("loading");
  try {
    renderSettings(await fetchSettings());
    showState("ready");
    if (!revealRateSectionIfRequested()) focusFirstField();
  } catch (err) {
    loadErrorMessage.textContent = errorMessage(err);
    showState("error");
    retryButton.focus();
  }
}

bindForm(form, async (values) => {
  const saved = await saveSettings(toChanges(values));
  renderSettings(saved);
  applyDisplayCurrency(saved.display_currency);
  toastSuccess("Configuración guardada");
});

window.addEventListener(CURRENCY_CHANGE_EVENT, () => fillForm(form, { display_currency: getDisplayCurrency() }));

retryButton.addEventListener("click", () => void loadSettings());

mountRateSettings();
mountBackupSettings();
mountAppSettings();
mountAccessSettings();
void loadSettings();
