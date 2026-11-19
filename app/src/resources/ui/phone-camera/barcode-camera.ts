import { type DetectedCode, pickDetectedCode } from "../phone-scan/barcode-formats";
import { type CameraProblem, cameraProblemFromError } from "../phone-scan/camera-problems";
import { type BarcodeDetectorInstance, createDetector } from "./barcode-detector";
import { applyTorch, enableContinuousFocus, stopTracks, trackCapabilities, VIDEO_CONSTRAINTS } from "./track-controls";

/** Código leído por la cámara. */
export interface CameraRead {
  code: string;
  format: string;
}

/** Opciones del lector con la cámara. */
export interface BarcodeCameraOptions {
  video: HTMLVideoElement;
  onRead: (read: CameraRead) => void;
  /** Se consulta antes de analizar cada fotograma; si devuelve `false` no se lee nada. */
  canRead: () => boolean;
}

const DETECT_INTERVAL_MS = 150;

/** Cámara trasera con lectura continua de códigos de barras mediante `BarcodeDetector`. */
export class BarcodeCamera {
  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorInstance | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private torchOn = false;
  private generation = 0;

  constructor(private readonly options: BarcodeCameraOptions) {}

  /** ¿La cámara está encendida? */
  get running(): boolean {
    return this.stream !== null;
  }

  /** ¿La cámara tiene linterna? */
  get hasTorch(): boolean {
    return trackCapabilities(this.track())?.torch === true;
  }

  /** ¿La linterna está encendida? */
  get torchEnabled(): boolean {
    return this.torchOn;
  }

  /** Enciende la cámara y empieza a leer. Devuelve el problema si no se pudo. */
  async start(): Promise<CameraProblem | null> {
    if (this.stream) return null;
    const generation = ++this.generation;
    this.detector ??= await createDetector();
    if (!this.detector) return "unsupported";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
    } catch (error) {
      return cameraProblemFromError(error);
    }
    if (generation !== this.generation) {
      stopTracks(stream);
      return null;
    }
    return this.play(stream, generation);
  }

  /** Apaga la cámara y la linterna. */
  stop(): void {
    this.generation++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (this.stream) stopTracks(this.stream);
    this.stream = null;
    this.torchOn = false;
    this.options.video.srcObject = null;
  }

  /** Enciende o apaga la linterna. Devuelve si quedó encendida. */
  async toggleTorch(): Promise<boolean> {
    const track = this.track();
    if (!track || !this.hasTorch) return false;
    this.torchOn = await applyTorch(track, !this.torchOn);
    return this.torchOn;
  }

  private async play(stream: MediaStream, generation: number): Promise<CameraProblem | null> {
    this.stream = stream;
    this.torchOn = false;
    await enableContinuousFocus(this.track());
    const { video } = this.options;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      if (generation !== this.generation) return null;
      this.stop();
      return cameraProblemFromError(error);
    }
    this.scheduleDetect(0);
    return null;
  }

  private track(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  private async readFrame(video: HTMLVideoElement): Promise<DetectedCode | null> {
    if (!this.detector) return null;
    try {
      return pickDetectedCode(await this.detector.detect(video));
    } catch {
      return null;
    }
  }

  private scheduleDetect(delayMs: number): void {
    const generation = this.generation;
    this.timer = setTimeout(() => void this.detectOnce(generation), delayMs);
  }

  private async detectOnce(generation: number): Promise<void> {
    const startedAt = performance.now();
    const { video, canRead, onRead } = this.options;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && canRead()) {
      const found = await this.readFrame(video);
      if (found && generation === this.generation && canRead())
        onRead({ code: found.rawValue.trim(), format: found.format });
    }
    if (generation !== this.generation) return;
    this.scheduleDetect(Math.max(0, DETECT_INTERVAL_MS - (performance.now() - startedAt)));
  }
}
