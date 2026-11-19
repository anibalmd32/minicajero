import { describeDevice } from "./device";
import type { PhoneConnection } from "./hub-types";
import type { Clock, PairingRegistry, PhoneSession } from "./pairing";
import { PHONE_CLOSE, PHONE_PROTOCOL_VERSION, type ScanContext, type ScanMessage } from "./phone.protocol";
import type { PhoneConnections } from "./phone-connections";
import { PHONE_TEXTS } from "./phone-texts";
import { sendMessage } from "./socket-io";

/** Lo que el saludo (`hello`) del teléfono necesita del hub. */
export interface HandshakeContext {
  registry: PairingRegistry;
  connections: PhoneConnections;
  clock: Clock;
  log: (message: string) => void;
  closePhone: (phone: PhoneConnection, code: number, reason: string) => void;
  currentContext: () => ScanContext;
  onAccepted: () => void;
  routeScan: (phone: PhoneConnection, message: ScanMessage) => void;
}

function acceptPhone(
  context: HandshakeContext,
  phone: PhoneConnection,
  session: PhoneSession,
  device: string | undefined,
): void {
  if (phone.helloTimer) clearTimeout(phone.helloTimer);
  phone.helloTimer = null;
  for (const other of context.connections.otherWithSession(phone, session.id)) {
    context.closePhone(other, PHONE_CLOSE.replaced, PHONE_TEXTS.replaced);
  }
  const now = new Date(context.clock()).toISOString();
  phone.session = session;
  const name = describeDevice(device ?? phone.userAgent);
  phone.info = { id: session.id, name, connected_at: now, last_seen_at: now };
  sendMessage(phone.socket, {
    type: "ready",
    version: PHONE_PROTOCOL_VERSION,
    session: session.token,
    phone: phone.info,
    context: context.currentContext(),
  });
}

function redeemToken(context: HandshakeContext, phone: PhoneConnection, token: string, device?: string): void {
  const result = context.registry.redeem(token, phone.ip);
  if (!result.ok) {
    const locked = result.reason === "locked";
    context.log(
      `Conexión de teléfono rechazada desde ${phone.ip} (${locked ? "demasiados intentos" : "token no válido"})`,
    );
    if (locked) context.closePhone(phone, PHONE_CLOSE.tooManyAttempts, PHONE_TEXTS.locked);
    else context.closePhone(phone, PHONE_CLOSE.invalidToken, PHONE_TEXTS.invalidToken);
    return;
  }
  acceptPhone(context, phone, result.session, device);
  context.log(`Teléfono ${result.resumed ? "reconectado" : "emparejado"}: ${phone.info?.name} (${phone.ip})`);
  context.onAccepted();
}

/** Atiende el `hello` de un teléfono: valida versión y token, y lo identifica o cierra su conexión. */
export function handleHello(
  context: HandshakeContext,
  phone: PhoneConnection,
  token: string,
  version: number,
  device: string | undefined,
): void {
  if (phone.session) {
    context.closePhone(phone, PHONE_CLOSE.badMessage, PHONE_TEXTS.badMessage);
  } else if (version !== PHONE_PROTOCOL_VERSION) {
    context.closePhone(phone, PHONE_CLOSE.outdated, PHONE_TEXTS.outdated);
  } else {
    redeemToken(context, phone, token, device);
  }
}

const NORMAL_CLOSE = 1000;

/** Atiende el `bye` de un teléfono: anula su sesión y cierra la conexión. */
export function handleBye(context: HandshakeContext, phone: PhoneConnection): void {
  if (phone.session) context.registry.revokeSession(phone.session.id);
  context.closePhone(phone, NORMAL_CLOSE, PHONE_TEXTS.bye);
}
