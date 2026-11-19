import { api } from "./api";

/** Datos de la aplicación devueltos por `/api/v1/app`. */
export interface AppInfo {
  name: string;
  version: string;
  desktop: boolean;
  executable: string | null;
  dataDir: string;
  databasePath: string;
  logPath: string | null;
  port: number;
}

/** Obtiene versión, carpeta de datos y modo de ejecución. */
export function fetchAppInfo(): Promise<AppInfo> {
  return api.get<AppInfo>("/app");
}

/** Pide al servidor que cierre la base de datos y termine. */
export function shutdownApp(): Promise<void> {
  return api.post<void>("/app/shutdown");
}

/** Instrucción para volver a abrir la aplicación según cómo se esté ejecutando. */
export function reopenInstructions(info: Pick<AppInfo, "desktop" | "executable">): string {
  if (info.desktop && info.executable) {
    return `Para volver a abrirla, haz doble clic en ${info.executable} (o en su acceso directo). Se abrirá sola en el navegador.`;
  }
  return "Para volver a abrirla, inicia de nuevo el servidor con «bun run start» en la carpeta app y recarga esta página.";
}
