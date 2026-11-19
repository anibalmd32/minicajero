/** Respuesta de DevTools Protocol con los campos que usan los scripts de captura y de pruebas. */
export interface CdpResult {
  data: string;
  result: { value: string };
  cssContentSize: { height: number };
}

interface CdpParams {
  type?: string;
  exceptionDetails?: { text: string; exception?: { description?: string } };
  args?: { value?: unknown; description?: string }[];
  entry?: { level: string; text: string; url?: string };
}

interface CdpMessage {
  id?: number;
  result?: unknown;
  error?: { message: string };
  method?: string;
  params?: CdpParams;
}

interface PendingRequest {
  resolve: (result: never) => void;
  reject: (error: Error) => void;
}

/** Cliente de DevTools Protocol sobre el WebSocket de una pestaña. */
export interface DevtoolsClient {
  send<T = CdpResult>(method: string, params?: object): Promise<T>;
  readonly errors: string[];
}

/** Abre el WebSocket de la primera pestaña de la página del Chrome que escucha en `port`. */
export async function connectToPage(port: number): Promise<WebSocket> {
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
    type: string;
    webSocketDebuggerUrl: string;
  }[];
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("No hay pestaña disponible");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  return socket;
}

function describeError(message: CdpMessage): string | null {
  const params = message.params;
  if (!params) return null;
  if (message.method === "Runtime.exceptionThrown" && params.exceptionDetails) {
    return params.exceptionDetails.exception?.description ?? params.exceptionDetails.text;
  }
  if (message.method === "Runtime.consoleAPICalled" && params.type === "error") {
    return (params.args ?? []).map((arg) => arg.value ?? arg.description).join(" ");
  }
  if (message.method === "Log.entryAdded" && params.entry?.level === "error") {
    return `${params.entry.text} ${params.entry.url ?? ""}`.trim();
  }
  return null;
}

/** Crea el cliente: responde a cada `send` con su resultado y recoge los errores de la página. */
export function createDevtoolsClient(socket: WebSocket): DevtoolsClient {
  const errors: string[] = [];
  const pending = new Map<number, PendingRequest>();
  let nextId = 0;
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id === undefined) {
      const error = describeError(message);
      if (error !== null) errors.push(error);
      return;
    }
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request?.reject(new Error(message.error.message));
    else request?.resolve(message.result as never);
  };
  const send = <T>(method: string, params: object = {}) => {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  return { send, errors };
}
