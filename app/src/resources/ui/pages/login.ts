import { ApiError, errorMessage } from "../api";
import { type AuthStatus, fetchAuthStatus, login, resetUser, setupUser } from "../auth";
import { requireElement } from "../dom";
import { bindForm, fillForm, showFieldErrors } from "../form";
import { loginDestination } from "../login-url";

type View = "setup" | "signin" | "reset";

const loading = requireElement<HTMLElement>("login-loading");
const errorBox = requireElement<HTMLElement>("login-error");
const errorMessageBox = requireElement<HTMLElement>("login-error-message");

const setupSection = requireElement<HTMLElement>("login-setup");
const signinSection = requireElement<HTMLElement>("login-signin");
const resetSection = requireElement<HTMLElement>("login-reset");

const setupForm = requireElement<HTMLFormElement>("setup-form");
const signinForm = requireElement<HTMLFormElement>("login-form");
const resetForm = requireElement<HTMLFormElement>("reset-form");

const forgotButton = requireElement<HTMLButtonElement>("login-forgot");
const resetBackButton = requireElement<HTMLButtonElement>("reset-back");

function showError(message: string): void {
  errorMessageBox.textContent = message;
  errorBox.classList.remove("d-none");
}

function clearError(): void {
  errorBox.classList.add("d-none");
  errorMessageBox.textContent = "";
}

function showView(view: View): void {
  setupSection.classList.toggle("d-none", view !== "setup");
  signinSection.classList.toggle("d-none", view !== "signin");
  resetSection.classList.toggle("d-none", view !== "reset");
  const form = view === "setup" ? setupForm : view === "signin" ? signinForm : resetForm;
  form.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
}

function goToApp(): void {
  window.location.href = loginDestination(window.location.search);
}

function fieldErrorOf(err: unknown, field: string): string | null {
  if (!(err instanceof ApiError) || !err.hasFieldErrors) return null;
  return err.details[field] ?? null;
}

function detailsFor(err: unknown, fields: readonly string[]): Record<string, string> {
  const details: Record<string, string> = {};
  for (const field of fields) {
    const message = fieldErrorOf(err, field);
    if (message) details[field] = message;
  }
  return details;
}

async function loadStatus(): Promise<void> {
  loading.classList.remove("d-none");
  try {
    const status: AuthStatus = await fetchAuthStatus();
    if (status.authenticated) {
      goToApp();
      return;
    }
    showView(status.needsSetup ? "setup" : "signin");
  } catch (err) {
    showError(`No se pudo comprobar el acceso. ${errorMessage(err)}`);
  } finally {
    loading.classList.add("d-none");
  }
}

bindForm(setupForm, async (values) => {
  clearError();
  if (values.password !== values.password_confirm) {
    showFieldErrors(setupForm, { password_confirm: "Las contraseñas no son iguales" });
    return;
  }
  try {
    await setupUser({ username: values.username ?? "", password: values.password ?? "" });
    goToApp();
  } catch (err) {
    const details = detailsFor(err, ["username", "password"]);
    if (Object.keys(details).length > 0) {
      showFieldErrors(setupForm, details);
      return;
    }
    showError(errorMessage(err));
  }
});

bindForm(signinForm, async (values) => {
  clearError();
  try {
    await login({ username: values.username ?? "", password: values.password ?? "" });
    goToApp();
  } catch (err) {
    const details = detailsFor(err, ["username"]);
    if (Object.keys(details).length > 0) {
      showFieldErrors(signinForm, details);
      return;
    }
    showError(errorMessage(err));
  }
});

bindForm(resetForm, async (values) => {
  clearError();
  if (values.password !== values.password_confirm) {
    showFieldErrors(resetForm, { password_confirm: "Las contraseñas no son iguales" });
    return;
  }
  try {
    await resetUser({
      master_key: values.master_key ?? "",
      username: values.username ?? "",
      password: values.password ?? "",
    });
    goToApp();
  } catch (err) {
    const details = detailsFor(err, ["master_key", "username", "password"]);
    if (Object.keys(details).length > 0) {
      showFieldErrors(resetForm, details);
      return;
    }
    showError(errorMessage(err));
  }
});

forgotButton.addEventListener("click", () => {
  clearError();
  fillForm(resetForm, { master_key: "", username: "", password: "", password_confirm: "" });
  showView("reset");
});

resetBackButton.addEventListener("click", () => {
  clearError();
  showView("signin");
});

void loadStatus();
