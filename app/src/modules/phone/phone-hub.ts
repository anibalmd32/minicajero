import { admissionError, type Rejection } from "./admission";
import type { PcTab, PeerSocket, PhoneConnection, PhoneHubOptions } from "./hub-types";
import { PcChannel } from "./pc-channel";
import { PHONE_CLOSE, type PhoneInfo, SCAN_TIMEOUT_MS, type ScanContext } from "./phone.protocol";
import { PhoneConnections } from "./phone-connections";
import { dispatchPhoneMessage } from "./phone-dispatch";
import type { HandshakeContext } from "./phone-handshake";
import { PHONE_TEXTS } from "./phone-texts";
import { closeQuietly, sendMessage } from "./socket-io";

export { MAX_UNIDENTIFIED_PER_IP, MAX_UNIDENTIFIED_TOTAL } from "./admission";
export type { PcTab, PeerSocket, PhoneConnection, PhoneHubOptions } from "./hub-types";
export { PHONE_TEXTS } from "./phone-texts";

/** Tiempo que tiene el teléfono para identificarse tras conectarse. */
export const HELLO_TIMEOUT_MS = 10_000;

/**
 * Centro del escáner: autentica teléfonos con `PairingRegistry`, sigue qué pestaña de la PC está activa y
 * reenvía cada escaneo a la pestaña de Ventas o Inventario enfocada más recientemente, devolviendo su respuesta
 * al teléfono (o un error amable si no hay pantalla o la PC no contesta a tiempo).
 */
export class PhoneHub {
  private readonly connections = new PhoneConnections();
  private readonly pc: PcChannel;
  private readonly helloTimeoutMs: number;
  private readonly handshake: HandshakeContext;
  private readonly onChange: () => void;
  private readonly log: (message: string) => void;

  constructor(private readonly options: PhoneHubOptions) {
    this.helloTimeoutMs = options.helloTimeoutMs ?? HELLO_TIMEOUT_MS;
    this.log = options.log ?? ((message) => console.log(message));
    this.onChange = options.onChange ?? (() => undefined);
    this.pc = new PcChannel(
      options.scanTimeoutMs ?? SCAN_TIMEOUT_MS,
      () => this.connectedPhones(),
      (context) => this.sendContextToPhones(context),
    );
    this.handshake = {
      registry: options.registry,
      connections: this.connections,
      clock: options.clock ?? Date.now,
      log: this.log,
      closePhone: (phone, code, reason) => this.closePhone(phone, code, reason),
      currentContext: () => this.currentContext(),
      routeScan: (phone, message) => this.pc.routeScan(phone, message),
      onAccepted: () => {
        this.pc.broadcastPhones();
        this.onChange();
      },
    };
  }

  /** Teléfonos identificados y conectados ahora mismo. */
  connectedPhones(): PhoneInfo[] {
    return this.connections.infos();
  }

  /** ¿Hay alguna conexión de teléfono abierta (identificada o no)? */
  hasPhoneConnections(): boolean {
    return this.connections.hasAny();
  }

  /** ¿Hay algún teléfono identificado? Las conexiones sin identificar no mantienen encendido el servidor. */
  hasIdentifiedPhones(): boolean {
    return this.connections.hasIdentified();
  }

  /** Motivo para rechazar una conexión nueva desde `ip`, o `null` si se acepta. */
  admissionError(ip: string): Rejection | null {
    return admissionError(this.options.registry, this.connections.all(), ip);
  }

  /** Pantalla de la PC a la que van los escaneos ahora mismo. */
  currentContext(): ScanContext {
    return this.pc.context();
  }

  phoneOpened(socket: PeerSocket, ip: string, userAgent: string | null): PhoneConnection {
    const phone: PhoneConnection = { socket, ip, userAgent, session: null, info: null, helloTimer: null };
    phone.helloTimer = setTimeout(
      () => this.closePhone(phone, PHONE_CLOSE.helloTimeout, PHONE_TEXTS.helloTimeout),
      this.helloTimeoutMs,
    );
    this.connections.add(phone);
    this.onChange();
    return phone;
  }

  phoneMessage(phone: PhoneConnection, raw: string): void {
    dispatchPhoneMessage(this.handshake, phone, raw);
  }

  phoneClosed(phone: PhoneConnection): void {
    if (!this.connections.remove(phone)) return;
    if (phone.helloTimer) clearTimeout(phone.helloTimer);
    this.pc.dropPhone(phone);
    if (phone.info) {
      this.log(`Teléfono desconectado: ${phone.info.name} (${phone.ip})`);
      this.pc.broadcastPhones();
    }
    this.onChange();
  }

  pcOpened(socket: PeerSocket): PcTab {
    return this.pc.open(socket);
  }

  pcMessage(tab: PcTab, raw: string): void {
    this.pc.message(tab, raw);
  }

  pcClosed(tab: PcTab): void {
    this.pc.close(tab);
  }

  /** Cierra todas las conexiones de teléfonos (p. ej. al desconectar desde la PC o apagar el servidor). */
  disconnectAllPhones(code: number = PHONE_CLOSE.disconnectedFromPc, reason: string = PHONE_TEXTS.disconnected): void {
    for (const phone of this.connections.all()) this.closePhone(phone, code, reason);
  }

  /** Desconecta un teléfono desde la PC y anula su sesión. Devuelve `false` si no estaba conectado. */
  disconnectPhone(phoneId: string): boolean {
    const phone = this.connections.findByPhoneId(phoneId);
    if (!phone?.session) return false;
    this.options.registry.revokeSession(phone.session.id);
    this.closePhone(phone, PHONE_CLOSE.disconnectedFromPc, PHONE_TEXTS.disconnected);
    return true;
  }

  /** Cierra las conexiones cuyas sesiones vencieron (ids devueltos por `PairingRegistry.expire`). */
  closeExpiredSessions(sessionIds: readonly string[]): void {
    for (const phone of this.connections.withSessionIn(new Set(sessionIds))) {
      this.closePhone(phone, PHONE_CLOSE.sessionExpired, PHONE_TEXTS.sessionExpired);
    }
  }

  private closePhone(phone: PhoneConnection, code: number, reason: string): void {
    closeQuietly(phone.socket, code, reason);
    this.phoneClosed(phone);
  }

  private sendContextToPhones(context: ScanContext): void {
    for (const phone of this.connections.all()) {
      if (phone.info) sendMessage(phone.socket, { type: "context", context });
    }
  }
}
