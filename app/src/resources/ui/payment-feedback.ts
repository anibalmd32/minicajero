import { ApiError } from "./api";
import { loadRateOverview } from "./exchange-rate";
import { dualAmountTexts, usdCentsToBs } from "./money";

/** Monto actual en dólares con su equivalente en bolívares entre paréntesis. */
export function currentAmountText(usdCents: number): string {
  const texts = dualAmountTexts(usdCents, usdCentsToBs(usdCents));
  return `${texts.primary} (${texts.secondary})`;
}

/** Si el servidor rechazó el abono por cambio de tasa, recarga la tasa y repinta el formulario. */
export async function refreshRateAfterConflict(err: unknown, refreshForm: () => void): Promise<void> {
  if (!(err instanceof ApiError) || err.status !== 409 || !err.details.rate) return;
  try {
    await loadRateOverview();
  } catch {
    return;
  }
  refreshForm();
}
