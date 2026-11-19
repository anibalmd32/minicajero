interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
}

export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

export function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

export function trackCapabilities(track: MediaStreamTrack | null): CameraCapabilities | null {
  if (!track || typeof track.getCapabilities !== "function") return null;
  return track.getCapabilities() as CameraCapabilities;
}

export async function enableContinuousFocus(track: MediaStreamTrack | null): Promise<void> {
  if (!track || !trackCapabilities(track)?.focusMode?.includes("continuous")) return;
  await track
    .applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] })
    .catch(() => undefined);
}

export async function applyTorch(track: MediaStreamTrack, wanted: boolean): Promise<boolean> {
  try {
    await track.applyConstraints({ advanced: [{ torch: wanted } as MediaTrackConstraintSet] });
    return wanted;
  } catch {
    return false;
  }
}
