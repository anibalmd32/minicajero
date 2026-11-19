import { errorMessage } from "../../api";
import { changeRateMode, refreshRate, reportRateRefresh } from "../../exchange-rate";
import { withBusyButton } from "../../form";
import { formatRate } from "../../format";
import { showToast, toastError, toastSuccess } from "../../toast";
import { elements } from "./elements";
import { resetHistoryOffset } from "./history-table";

export async function onRefresh(): Promise<void> {
  resetHistoryOffset();
  try {
    reportRateRefresh(await withBusyButton(elements.refreshButton, refreshRate, "Actualizando…"));
  } catch (err) {
    toastError(errorMessage(err));
  }
}

export async function onBackToAuto(): Promise<void> {
  resetHistoryOffset();
  try {
    const overview = await withBusyButton(elements.autoButton, () => changeRateMode("auto"), "Cambiando…");
    if (overview.rate === null) {
      showToast("Modo automático activado, pero aún no hay tasa oficial. Revisa la conexión a internet.", "warning");
      return;
    }
    toastSuccess(`Modo automático activado. Tasa vigente: Bs ${formatRate(overview.rate)}`);
  } catch (err) {
    toastError(errorMessage(err));
  }
}
