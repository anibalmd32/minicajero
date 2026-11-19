import { spawn } from "node:child_process";

/** Comando que abre `url` en el navegador predeterminado del sistema, sin ventana de consola. */
export function browserCommand(url: string, platform: NodeJS.Platform = process.platform): [string, ...string[]] {
  if (platform === "win32") return ["rundll32.exe", "url.dll,FileProtocolHandler", url];
  if (platform === "darwin") return ["open", url];
  return ["xdg-open", url];
}

/**
 * Abre `url` en el navegador predeterminado. Devuelve `false` (y lo registra) si no se pudo lanzar.
 * El proceso se lanza desacoplado: en Windows, `Bun.spawn` mata a sus hijos cuando el proceso termina,
 * y la segunda ejecución de la app sale justo después de pedir que se abra el navegador.
 */
export function openBrowser(url: string): boolean {
  const [command, ...args] = browserCommand(url);
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    child.on("error", (err) => console.error(`No se pudo abrir el navegador en ${url}:`, err));
    child.unref();
    return true;
  } catch (err) {
    console.error(`No se pudo abrir el navegador en ${url}:`, err);
    return false;
  }
}
