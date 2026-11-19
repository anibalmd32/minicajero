import { confirmAction } from "../../confirm";
import { getLastRateOverview, saveManualRate } from "../../exchange-rate";
import { showFieldErrors } from "../../form";
import { formatRate, isAmbiguousThousands, numberForRequest, parseDecimalInput } from "../../format";
import { toastSuccess } from "../../toast";
import { elements } from "./elements";
import { resetHistoryOffset } from "./history-table";

const LARGE_CHANGE_RATIO = 0.5;

function rateForRequest(text: string): number | string | null {
  return numberForRequest(parseDecimalInput(text), text);
}

function confirmLargeChange(rate: number | string | null): Promise<boolean> {
  const current = getLastRateOverview()?.rate ?? null;
  if (typeof rate !== "number" || current === null || current <= 0) return Promise.resolve(true);
  if (Math.abs(rate / current - 1) <= LARGE_CHANGE_RATIO) return Promise.resolve(true);
  return confirmAction({
    title: "Confirmar tasa manual",
    message: `La tasa Bs ${formatRate(rate)} es muy distinta de la vigente (Bs ${formatRate(current)}). ¿Seguro que quieres fijarla?`,
    confirmText: "Fijar tasa",
    variant: "warning",
  });
}

/** Fija la tasa manual escrita en el formulario, pidiendo confirmación si cambia mucho. */
export async function onManualRate(text: string): Promise<void> {
  if (isAmbiguousThousands(text)) {
    showFieldErrors(elements.manualForm, {
      rate: "Usa coma para los decimales: escribe 1.050,25 para mil cincuenta o 1,05 para uno con cinco.",
    });
    return;
  }
  const rate = rateForRequest(text);
  if (!(await confirmLargeChange(rate))) {
    elements.manualRateInput.focus();
    return;
  }
  resetHistoryOffset();
  const overview = await saveManualRate(rate);
  elements.manualForm.reset();
  toastSuccess(`Tasa manual fijada: Bs ${formatRate(overview.rate ?? Number.NaN)}`);
}
