import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ScenePhase } from "../utils/canvasRenderer";
import type { useRecorder } from "./useRecorder";

export interface Take {
  phase: ScenePhase;
  /** performance.now() when this phase (or countdown number) began. */
  startedAt: number;
  countdown: number;
}

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 1000;
/** How long the final screen stays before recording stops. */
const FINAL_HOLD_MS = 4500;

export const IDLE_TAKE: Take = { phase: "idle", startedAt: 0, countdown: COUNTDOWN_FROM };

interface UseTakeOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Microphone stream mixed into the recording, if the template uses one. */
  stream: MediaStream | null;
  /** When false the take can start without a stream (templates that draw everything themselves). */
  requireStream?: boolean;
  cameraReady: boolean;
  recorder: ReturnType<typeof useRecorder>;
  /** True once the template has collected everything it needs. */
  isComplete: boolean;
  /** Time to let the last pick animation play before the final screen. */
  completeDelayMs: number;
  resetProgress: () => void;
}

/**
 * The recording timeline shared by every template:
 * idle → countdown (3-2-1) → playing → final → stop.
 */
export function useTake({
  canvasRef,
  stream,
  requireStream = true,
  cameraReady,
  recorder,
  isComplete,
  completeDelayMs,
  resetProgress
}: UseTakeOptions) {
  const [take, setTake] = useState<Take>(IDLE_TAKE);
  const { start, stop, cancel, error } = recorder;

  const abort = useCallback(() => {
    cancel();
    resetProgress();
    setTake(IDLE_TAKE);
  }, [cancel, resetProgress]);

  const begin = useCallback(() => {
    resetProgress();
    setTake({ phase: "countdown", countdown: COUNTDOWN_FROM, startedAt: performance.now() });
  }, [resetProgress]);

  // Countdown 3 → 2 → 1, then start recording.
  useEffect(() => {
    if (take.phase !== "countdown") return;
    const id = window.setTimeout(() => {
      if (take.countdown > 1) {
        setTake({ phase: "countdown", countdown: take.countdown - 1, startedAt: performance.now() });
        return;
      }
      const canvas = canvasRef.current;
      if (canvas && (stream || !requireStream) && start(canvas, stream)) {
        setTake({ phase: "playing", countdown: 0, startedAt: performance.now() });
      } else {
        setTake(IDLE_TAKE);
      }
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(id);
  }, [take, stream, requireStream, start, canvasRef]);

  // Last pick made: let its animation play, then show the final screen.
  useEffect(() => {
    if (take.phase !== "playing" || !isComplete) return;
    const id = window.setTimeout(
      () => setTake({ phase: "final", countdown: 0, startedAt: performance.now() }),
      completeDelayMs
    );
    return () => window.clearTimeout(id);
  }, [take.phase, isComplete, completeDelayMs]);

  // Hold the final screen, then stop; useRecorder reports the finished video.
  useEffect(() => {
    if (take.phase !== "final") return;
    const id = window.setTimeout(stop, FINAL_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [take.phase, stop]);

  // Camera lost or recorder failed mid-take: drop the take instead of keeping a broken video.
  useEffect(() => {
    if ((!cameraReady || error) && take.phase !== "idle") abort();
    // Reacts only to camera/recorder changes, not to every phase change.
  }, [cameraReady, error]);

  return { take, begin, abort };
}
