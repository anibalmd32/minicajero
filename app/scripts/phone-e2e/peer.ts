import type { WireMessage } from "../e2e-support/messages";

/** Extremo simulado (teléfono o pestaña de la PC) conectado por WebSocket. */
export interface Peer {
  socket: WebSocket;
  next(type?: string, timeoutMs?: number): Promise<WireMessage>;
  closed: Promise<{ code: number; reason: string }>;
  send(message: object): void;
}

function createMessageQueue(socket: WebSocket) {
  const queue: WireMessage[] = [];
  const waiters: (() => void)[] = [];
  socket.addEventListener("message", (event) => {
    queue.push(JSON.parse(String(event.data)));
    for (const wake of waiters.splice(0)) wake();
  });
  const next = async (type?: string, timeoutMs = 3000): Promise<WireMessage> => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const index = queue.findIndex((message) => type === undefined || message.type === type);
      const found = index >= 0 ? queue.splice(index, 1)[0] : undefined;
      if (found) return found;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error(`No llegó el mensaje ${type ?? ""}`);
      await Promise.race([new Promise<void>((wake) => waiters.push(wake)), Bun.sleep(remaining)]);
    }
  };
  return next;
}

/** Abre un WebSocket y lo envuelve en un `Peer` con cola de mensajes. */
export function connect(url: string, options: object): Promise<Peer> {
  const socket = new WebSocket(url, options as never);
  const next = createMessageQueue(socket);
  const closed = new Promise<{ code: number; reason: string }>((resolve) =>
    socket.addEventListener("close", (event) => resolve({ code: event.code, reason: event.reason })),
  );
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () =>
      resolve({ socket, next, closed, send: (message) => socket.send(JSON.stringify(message)) }),
    );
    socket.addEventListener("error", () => reject(new Error(`No se pudo conectar a ${url}`)));
  });
}
