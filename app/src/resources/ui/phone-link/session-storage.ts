const SESSION_STORAGE_KEY = "minicajero.phone-session";

/** Token guardado en esta pestaña (el del QR hasta que se acepta la conexión, luego el de sesión): sobrevive a recargar la página. */
export function storedPhoneSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSession(token: string | null): void {
  try {
    if (token === null) sessionStorage.removeItem(SESSION_STORAGE_KEY);
    else sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    return;
  }
}
