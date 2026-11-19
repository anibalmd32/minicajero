/** Mensajes para el teléfono (cortos: se muestran en pantalla). */
export const PHONE_TEXTS = {
  noTarget: "Abre Ventas o Inventario en la computadora",
  timeout: "La computadora no respondió. Intenta de nuevo.",
  tabClosed: "Se cerró la pantalla en la computadora. Intenta de nuevo.",
  invalidCode: "No se pudo leer ese código. Intenta de nuevo.",
  busy: "Espera un momento y vuelve a intentarlo.",
  invalidToken: "Este QR ya no sirve. Genera otro en la computadora.",
  locked: "Demasiados intentos. Espera unos minutos.",
  helloTimeout: "No se pudo conectar. Escanea el QR otra vez.",
  sessionExpired: "La conexión venció. Escanea el QR otra vez.",
  replaced: "Este teléfono se conectó en otra pestaña.",
  outdated: "Recarga la página para continuar.",
  badMessage: "Mensaje no válido.",
  disconnected: "Desconectado desde la computadora.",
  restarting: "Reconectando…",
  bye: "Desconectado.",
} as const;
