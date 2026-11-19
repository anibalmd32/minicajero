import { isAppUnreachable } from "./api";
import { logout } from "./auth";
import { confirmAction } from "./confirm";
import { withBusyButton } from "./form";
import { toastError } from "./toast";

const LOGOUT_ICON = `
  <svg class="nav-logout-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M6 2.5A1.5 1.5 0 0 1 7.5 1h5A1.5 1.5 0 0 1 14 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-1h1v1a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5v1h-1v-1Z"/>
    <path d="M9.5 4.5 8 6l1 1H3v2h6l-1 1 1.5 1.5L13 8 9.5 4.5Z"/>
  </svg>`;

/**
 * Pinta el botón "Salir" de la navbar: cierra la sesión en este equipo y lleva a la página de acceso.
 * Pide confirmación antes de salir.
 */
export function mountLogoutButton(anchor: Element): void {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm btn-outline-light nav-logout";
  button.innerHTML = `${LOGOUT_ICON}<span class="nav-logout-label">Salir</span>`;
  button.setAttribute("aria-label", "Cerrar sesión");

  button.addEventListener("click", () => {
    void closeSession(button);
  });

  anchor.before(button);
}

async function closeSession(button: HTMLButtonElement): Promise<void> {
  const confirmed = await confirmAction({
    title: "Cerrar sesión",
    message: "Salirás de MiniCajero en este equipo. Tendrás que entrar otra vez con tu usuario y tu contraseña.",
    confirmText: "Cerrar sesión",
    variant: "primary",
  });
  if (!confirmed) return;
  try {
    await withBusyButton(button, logout, "Cerrando…");
    window.location.href = "/login";
  } catch (err) {
    if (isAppUnreachable(err)) {
      window.location.href = "/login";
      return;
    }
    toastError(`No se pudo cerrar la sesión. ${err instanceof Error ? err.message : "Inténtalo de nuevo."}`);
  }
}
