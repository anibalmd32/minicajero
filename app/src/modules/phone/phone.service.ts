import { ConflictError, NotFoundError } from "../../lib/http-errors";
import { qrToSvg } from "../../lib/qr";
import { phoneDataDir } from "./certificate-store";
import { LanServerHost, type RunningServer } from "./lan-server-host";
import { currentLocalAddresses } from "./network";
import { type Clock, PairingRegistry } from "./pairing";
import { PAIRING_TOKEN_PARAM, PHONE_PAGE_PATH } from "./phone.protocol";
import { IDLE_SHUTDOWN_MS, type PairingInfo, type PhoneScannerOptions, type PhoneStatus } from "./phone.service.types";
import { type PcTab, type PeerSocket, PhoneHub } from "./phone-hub";

export type { PairingInfo, PairingUrl, PhoneScannerOptions, PhoneStatus } from "./phone.service.types";
export { IDLE_SHUTDOWN_MS, PHONE_PORT_FILE } from "./phone.service.types";

/**
 * Escáner con el teléfono: crea emparejamientos (QR con token), enciende el servidor HTTPS de la red local
 * solo mientras hace falta y lo apaga tras 15 min sin teléfonos ni QR pendiente, o al desconectar desde la PC.
 */
export class PhoneScanner {
  readonly hub: PhoneHub;
  private readonly registry: PairingRegistry;
  private readonly clock: Clock;
  private readonly host: LanServerHost;

  constructor(private readonly options: PhoneScannerOptions) {
    this.clock = options.clock ?? Date.now;
    const log = options.log ?? ((message: string) => console.log(message));
    this.registry = new PairingRegistry(this.clock);
    this.hub = new PhoneHub({
      registry: this.registry,
      clock: this.clock,
      scanTimeoutMs: options.scanTimeoutMs,
      helloTimeoutMs: options.helloTimeoutMs,
      log,
      onChange: () => this.sweep(),
    });
    this.host = new LanServerHost({
      dir: phoneDataDir(options.dataDir),
      appPort: options.appPort,
      clock: this.clock,
      hub: this.hub,
      log,
      sweepIntervalMs: options.sweepIntervalMs,
      onSweep: () => this.sweep(),
    });
  }

  /** Crea un QR nuevo (reemplaza al pendiente), enciende el servidor si hace falta y devuelve las URL para el teléfono. */
  async startPairing(): Promise<PairingInfo> {
    const addresses = (this.options.addresses ?? currentLocalAddresses)();
    if (addresses.length === 0) {
      throw new ConflictError("La computadora no está conectada a ninguna red. Conéctala a la WiFi del local.");
    }
    const { port } = await this.ensureServerForPairing(addresses.map((address) => address.ip));
    const ticket = this.registry.createPairing();
    this.sweep();
    const urls = addresses.map(({ ip, label }) => {
      const url = `https://${ip}:${port}${PHONE_PAGE_PATH}#${PAIRING_TOKEN_PARAM}=${ticket.token}`;
      return { ip, label, url, qr_svg: qrToSvg(url, { title: "Código QR para conectar el teléfono" }) };
    });
    const expires_at = new Date(ticket.expiresAt).toISOString();
    return { urls, qr_svg: urls[0]?.qr_svg ?? "", expires_at, port };
  }

  /** Estado actual: si el servidor está encendido, el QR pendiente y los teléfonos conectados. */
  status(): PhoneStatus {
    const running = this.host.running;
    const pendingExpiresAt = running ? this.registry.pendingExpiresAt() : null;
    return {
      active: running !== null,
      port: running?.port ?? null,
      pairing_expires_at: pendingExpiresAt === null ? null : new Date(pendingExpiresAt).toISOString(),
      context: this.hub.currentContext(),
      phones: this.hub.connectedPhones(),
    };
  }

  /**
   * Anula el QR que se mostraba si nadie lo usó. Sin teléfonos conectados ni sesiones para reconectar,
   * apaga el servidor de la red local en el acto.
   */
  cancelPairing(token: string): void {
    if (!this.registry.cancelPending(token)) return;
    if (this.hub.hasIdentifiedPhones() || this.registry.hasSessions()) return;
    this.host.stop();
  }

  /** Desconecta todos los teléfonos, anula QR y sesiones y apaga el servidor de la red local. */
  disconnectAll(): void {
    this.registry.revokeAll();
    this.hub.disconnectAllPhones();
    this.host.stop();
  }

  /** Desconecta un teléfono y anula su sesión; 404 si ya no estaba conectado. */
  disconnectPhone(phoneId: string): void {
    if (!this.hub.disconnectPhone(phoneId)) throw new NotFoundError("Ese teléfono ya no está conectado");
  }

  /** Conecta una pestaña de la PC al canal en tiempo real. */
  pcOpened(socket: PeerSocket): PcTab {
    return this.hub.pcOpened(socket);
  }

  /** Vence QR y sesiones y apaga el servidor si lleva el tiempo de inactividad sin teléfonos ni QR pendiente. */
  sweep(): void {
    this.hub.closeExpiredSessions(this.registry.expire());
    if (!this.host.running) return;
    const busy = this.hub.hasIdentifiedPhones() || this.registry.pendingExpiresAt() !== null;
    if (!this.host.idleTooLong(busy, this.options.idleShutdownMs ?? IDLE_SHUTDOWN_MS)) return;
    this.registry.revokeAll();
    this.host.stop();
  }

  /** Apaga todo al cerrar la aplicación. */
  shutdown(): void {
    this.registry.revokeAll();
    this.host.stop();
  }

  private async ensureServerForPairing(ips: string[]): Promise<RunningServer> {
    try {
      return await this.host.ensure(ips);
    } catch (err) {
      console.error("No se pudo encender el servidor del teléfono:", err);
      throw new ConflictError(
        "No se pudo activar la conexión con el teléfono. Cierra otros programas e inténtalo de nuevo.",
      );
    }
  }
}

let scanner: PhoneScanner | null = null;

/** Crea el escáner de la aplicación al arrancar. */
export function configurePhoneScanner(options: PhoneScannerOptions): PhoneScanner {
  scanner?.shutdown();
  scanner = new PhoneScanner(options);
  return scanner;
}

/** Escáner configurado al arrancar; lanza si la aplicación no lo configuró. */
export function getPhoneScanner(): PhoneScanner {
  if (!scanner) throw new Error("El escáner con el teléfono no está configurado");
  return scanner;
}
