import { downloadCurrentBackup, loadBackups } from "./backup-list";
import { elements } from "./elements";
import { bindRestoreModal } from "./restore-modal";

/** Conecta la sección "Respaldo" de Configuración: descarga, respaldos automáticos y restauración. */
export function mountBackupSettings(): void {
  elements.downloadButton.addEventListener("click", () => void downloadCurrentBackup());
  elements.listRetry.addEventListener("click", () => void loadBackups());
  bindRestoreModal();
  void loadBackups();
}
