import { ApiError, errorMessage } from "../api";
import { changePassword, fetchAuthStatus, logout } from "../auth";
import { confirmAction } from "../confirm";
import { requireElement } from "../dom";
import { bindForm, showFieldErrors } from "../form";
import { toastError, toastSuccess } from "../toast";

const usernameLabel = requireElement<HTMLElement>("access-username");
const passwordForm = requireElement<HTMLFormElement>("password-form");
const logoutButton = requireElement<HTMLButtonElement>("access-logout");

async function loadUsername(): Promise<void> {
  try {
    const status = await fetchAuthStatus();
    usernameLabel.textContent = status.username ?? "—";
  } catch {
    usernameLabel.textContent = "—";
  }
}

async function savePassword(values: Record<string, string>): Promise<void> {
  if (values.new_password !== values.confirm_password) {
    showFieldErrors(passwordForm, { confirm_password: "Las contraseñas no son iguales" });
    return;
  }
  await changePassword({
    current_password: values.current_password ?? "",
    new_password: values.new_password ?? "",
  });
  passwordForm.reset();
  toastSuccess("Contraseña guardada");
}

async function closeSession(): Promise<void> {
  const confirmed = await confirmAction({
    title: "Cerrar sesión",
    message: "Salirás de MiniCajero en este equipo. Tendrás que entrar otra vez con tu usuario y tu contraseña.",
    confirmText: "Cerrar sesión",
    variant: "primary",
  });
  if (!confirmed) return;
  await logout();
  window.location.href = "/login";
}

/** Conecta la sección «Acceso» de Configuración: usuario actual, cambio de contraseña y cierre de sesión. */
export function mountAccessSettings(): void {
  bindForm(passwordForm, async (values) => {
    try {
      await savePassword(values);
    } catch (err) {
      if (err instanceof ApiError && err.hasFieldErrors) {
        showFieldErrors(passwordForm, err.details);
        return;
      }
      throw err;
    }
  });
  logoutButton.addEventListener("click", () => {
    void closeSession().catch((err) => {
      toastError(`No se pudo cerrar la sesión. ${errorMessage(err)}`);
    });
  });
  void loadUsername();
}
