import { errorMessage, isAppUnreachable } from "../api";
import { type AppInfo, fetchAppInfo, reopenInstructions, shutdownApp } from "../app-info";
import { confirmAction } from "../confirm";
import { requireElement } from "../dom";
import { withBusyButton } from "../form";
import { toastError } from "../toast";

type ViewState = "loading" | "error" | "ready";

const loading = requireElement<HTMLElement>("app-info-loading");
const loadError = requireElement<HTMLElement>("app-info-error");
const loadErrorMessage = requireElement<HTMLElement>("app-info-error-message");
const retryButton = requireElement<HTMLButtonElement>("app-info-retry");
const content = requireElement<HTMLElement>("app-info");
const version = requireElement<HTMLElement>("app-version");
const dataDir = requireElement<HTMLElement>("app-data-dir");
const logRow = requireElement<HTMLElement>("app-log-row");
const logPath = requireElement<HTMLElement>("app-log-path");
const shutdownButton = requireElement<HTMLButtonElement>("app-shutdown");
const shutdownErrorButton = requireElement<HTMLButtonElement>("app-shutdown-error");

let currentInfo: AppInfo | null = null;

function showState(state: ViewState): void {
  loading.classList.toggle("d-none", state !== "loading");
  loadError.classList.toggle("d-none", state !== "error");
  content.classList.toggle("d-none", state !== "ready");
}

function renderInfo(info: AppInfo): void {
  version.textContent = info.desktop ? info.version : `${info.version} (desarrollo)`;
  dataDir.textContent = info.dataDir;
  logPath.textContent = info.logPath ?? "";
  logRow.classList.toggle("d-none", info.logPath === null);
}

async function loadInfo(): Promise<void> {
  showState("loading");
  try {
    currentInfo = await fetchAppInfo();
    renderInfo(currentInfo);
    showState("ready");
  } catch (err) {
    loadErrorMessage.textContent = isAppUnreachable(err)
      ? "MiniCajero no está en marcha en este equipo."
      : errorMessage(err);
    showState("error");
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderClosedScreen(info: AppInfo | null): void {
  const card = element("div", "card shadow-sm app-closed-card");
  const body = element("div", "card-body p-4 text-center");
  const title = element("h1", "h4 mb-3", "MiniCajero se cerró");
  title.tabIndex = -1;
  body.append(
    title,
    element("p", "mb-2", "Los datos quedaron guardados. Ya puedes cerrar esta pestaña."),
    element(
      "p",
      "text-body-secondary mb-0",
      info ? reopenInstructions(info) : "Vuelve a abrir la aplicación para seguir facturando.",
    ),
  );
  card.append(body);
  const main = element("main", "app-closed");
  main.append(card);
  document.title = "MiniCajero cerrado";
  document.body.replaceChildren(main);
  title.focus();
}

async function closeApplication(button: HTMLButtonElement): Promise<void> {
  const info = currentInfo;
  const confirmed = await confirmAction({
    title: "Cerrar MiniCajero",
    message:
      "La aplicación dejará de funcionar hasta que vuelvas a abrirla. Lo que ya guardaste no se pierde. ¿Cerrar ahora?",
    confirmText: "Cerrar aplicación",
  });
  if (!confirmed) return;
  try {
    await withBusyButton(button, shutdownApp, "Cerrando…");
    renderClosedScreen(info);
  } catch (err) {
    if (isAppUnreachable(err)) {
      renderClosedScreen(info);
      return;
    }
    toastError(`No se pudo cerrar la aplicación. ${errorMessage(err)}`);
  }
}

/** Conecta la sección "Aplicación" de Configuración: datos del programa y botón para cerrarlo. */
export function mountAppSettings(): void {
  retryButton.addEventListener("click", () => void loadInfo());
  shutdownButton.addEventListener("click", () => void closeApplication(shutdownButton));
  shutdownErrorButton.addEventListener("click", () => void closeApplication(shutdownErrorButton));
  void loadInfo();
}
