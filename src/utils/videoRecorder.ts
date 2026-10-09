/** Best first. WebM is preferred; MP4 is the fallback for Safari / iPhone. */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4"
];

export const RECORDING_FPS = 30;
export const VIDEO_BITS_PER_SECOND = 8_000_000;
export const AUDIO_BITS_PER_SECOND = 128_000;

export function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function extensionForMime(mimeType: string): "webm" | "mp4" {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

/** Canvas picture + optional microphone audio, without touching the camera stream itself. */
export function createRecordingStream(canvas: HTMLCanvasElement, micStream: MediaStream | null): MediaStream {
  const canvasStream = canvas.captureStream(RECORDING_FPS);
  return new MediaStream([...canvasStream.getVideoTracks(), ...(micStream?.getAudioTracks() ?? [])]);
}

function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

/**
 * On phones the share sheet lets people save straight to the gallery.
 * Everywhere else (and if sharing fails) we trigger a normal download.
 */
export async function saveVideo(blob: Blob, filename: string): Promise<void> {
  if (isTouchDevice() && typeof navigator.canShare === "function") {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
