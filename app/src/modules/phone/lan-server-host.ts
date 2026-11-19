import { join } from "node:path";
import { isPortInUse, readSavedPort, savePort } from "../../desktop/instance";
import { candidatePorts, isAddressInUse, NoFreePortError } from "../../desktop/launcher";
import type { CertificatePair } from "./certificate";
import { loadOrCreateCertificate } from "./certificate-store";
import { type LanServer, startLanServer } from "./lan-server";
import type { Clock } from "./pairing";
import { PHONE_CLOSE } from "./phone.protocol";
import { PHONE_PORT_FILE } from "./phone.service.types";
import type { PhoneHub } from "./phone-hub";
import { PHONE_TEXTS } from "./phone-texts";

const SWEEP_INTERVAL_MS = 30 * 1000;
const PORT_SEARCH_SIZE = 10;

/** Servidor de la red local ya encendido y el puerto en el que escucha. */
export interface RunningServer {
  server: LanServer;
  port: number;
}

/** Dependencias del anfitrión del servidor de la red local. */
export interface LanServerHostOptions {
  dir: string;
  appPort: number;
  clock: Clock;
  hub: PhoneHub;
  log: (message: string) => void;
  sweepIntervalMs?: number;
  onSweep: () => void;
}

/** Enciende y apaga el servidor HTTPS de la red local: certificado, puerto libre y reinicio si cambian las IP. */
export class LanServerHost {
  running: RunningServer | null = null;
  private idleSince: number | null = null;
  private starting: Promise<RunningServer> | null = null;
  private certificateIps: string[] = [];
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: LanServerHostOptions) {}

  async ensure(ips: string[]): Promise<RunningServer> {
    if (this.starting) await this.starting.catch(() => undefined);
    const covered = this.running !== null && ips.every((ip) => this.certificateIps.includes(ip));
    if (this.running && covered) return this.running;
    this.starting = this.start(ips);
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  idleTooLong(busy: boolean, limitMs: number): boolean {
    if (busy) {
      this.idleSince = null;
      return false;
    }
    const now = this.options.clock();
    this.idleSince ??= now;
    return now - this.idleSince >= limitMs;
  }

  stop(closeCode?: number, closeReason?: string): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
    const running = this.running;
    if (!running) return;
    this.running = null;
    this.idleSince = null;
    this.options.hub.disconnectAllPhones(closeCode, closeReason);
    void running.server.stop(true);
    this.options.log("Servidor del teléfono apagado");
  }

  private get portFile(): string {
    return join(this.options.dir, PHONE_PORT_FILE);
  }

  private async start(ips: string[]): Promise<RunningServer> {
    const { dir, clock, log } = this.options;
    const certificate = loadOrCreateCertificate(dir, ips, new Date(clock()));
    if (certificate.created) log("Certificado del servidor del teléfono creado");
    this.certificateIps = certificate.ips;
    if (this.running && !certificate.created) return this.running;
    const previousPort = this.running?.port ?? null;
    if (this.running) this.stop(PHONE_CLOSE.restarting, PHONE_TEXTS.restarting);
    const preferred = previousPort ?? readSavedPort(this.portFile) ?? this.options.appPort + 1;
    const running = await this.listenOnFreePort(preferred, certificate);
    this.running = running;
    this.idleSince = null;
    this.sweepTimer = setInterval(() => this.options.onSweep(), this.options.sweepIntervalMs ?? SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
    this.rememberPort(running.port);
    log(`Servidor del teléfono encendido en el puerto ${running.port}`);
    return running;
  }

  private rememberPort(port: number): void {
    if (readSavedPort(this.portFile) === port) return;
    try {
      savePort(this.portFile, port);
    } catch (err) {
      console.error("No se pudo guardar el puerto del servidor del teléfono:", err);
    }
  }

  private async listenOnFreePort(preferred: number, tls: CertificatePair): Promise<RunningServer> {
    const ports = candidatePorts(preferred, PORT_SEARCH_SIZE).filter((port) => port !== this.options.appPort);
    for (const port of ports) {
      if (await isPortInUse(port)) continue;
      try {
        return { server: startLanServer(port, tls, this.options.hub), port };
      } catch (err) {
        if (!isAddressInUse(err)) throw err;
      }
    }
    throw new NoFreePortError(ports[0] ?? preferred, ports.at(-1) ?? preferred);
  }
}
