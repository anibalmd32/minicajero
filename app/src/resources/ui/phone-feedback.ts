/** Tipo de aviso al recibir la respuesta de un escaneo. */
export type FeedbackKind = "success" | "error";

interface Tone {
  frequency: number;
  startS: number;
  durationS: number;
}

const TONES: Record<FeedbackKind, Tone[]> = {
  success: [{ frequency: 1760, startS: 0, durationS: 0.09 }],
  error: [
    { frequency: 330, startS: 0, durationS: 0.14 },
    { frequency: 262, startS: 0.18, durationS: 0.2 },
  ],
};

const VIBRATIONS: Record<FeedbackKind, number | number[]> = {
  success: 60,
  error: [140, 90, 140],
};

const VOLUMES: Record<FeedbackKind, number> = { success: 0.2, error: 0.07 };
const RAMP_S = 0.01;

/** Sonido corto (WebAudio, sin archivos) y vibración para confirmar o avisar de un escaneo. */
export class ScanFeedback {
  private audio: AudioContext | null = null;

  /** Prepara el audio; llamar desde un toque del usuario para que el navegador lo permita. */
  unlock(): void {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === "suspended") void this.audio.resume();
    } catch {
      this.audio = null;
    }
  }

  /** Suena y vibra según el resultado. */
  play(kind: FeedbackKind): void {
    this.vibrate(kind);
    this.beep(kind);
  }

  private vibrate(kind: FeedbackKind): void {
    if (typeof navigator.vibrate !== "function" || navigator.userActivation?.hasBeenActive === false) return;
    navigator.vibrate(VIBRATIONS[kind]);
  }

  private beep(kind: FeedbackKind): void {
    const audio = this.audio;
    if (audio?.state !== "running") return;
    const now = audio.currentTime;
    const volume = VOLUMES[kind];
    for (const tone of TONES[kind]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = kind === "success" ? "sine" : "square";
      oscillator.frequency.value = tone.frequency;
      const start = now + tone.startS;
      const end = start + tone.durationS;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + RAMP_S);
      gain.gain.setValueAtTime(volume, end - RAMP_S);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(end);
    }
  }
}
