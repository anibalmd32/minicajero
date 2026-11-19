import { type CdpResult, connectToPage, createDevtoolsClient } from "./chrome-support/devtools";
import { launchChrome } from "./chrome-support/launch";

export { sleep } from "./chrome-support/sleep";

/** Pestaña de Chrome headless controlada por DevTools Protocol. */
export interface ChromePage {
  send<T = CdpResult>(method: string, params?: object): Promise<T>;
  /** Errores de JS y de consola que ha emitido la página hasta ahora. */
  readonly errors: string[];
  close(): Promise<void>;
}

/** Opciones de arranque de Chrome. */
export interface ChromeOptions {
  /** Acepta certificados no reconocidos (p. ej. el autofirmado del servidor del teléfono). */
  ignoreCertificateErrors?: boolean;
}

/**
 * Abre Chrome/Edge headless con un perfil temporal y devuelve su pestaña con Runtime, Log y Page activados.
 */
export async function openChromePage(options: ChromeOptions = {}): Promise<ChromePage> {
  const chrome = await launchChrome(options.ignoreCertificateErrors ?? false);
  try {
    const socket = await connectToPage(chrome.port);
    const client = createDevtoolsClient(socket);
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Page.enable");
    const close = async () => {
      socket.close();
      await chrome.close();
    };
    return { send: client.send, errors: client.errors, close };
  } catch (error) {
    await chrome.close();
    throw error;
  }
}
