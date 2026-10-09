import { useEffect, useRef, useState } from "react";
import { CameraGate } from "../components/CameraGate";
import { CameraView } from "../components/CameraView";
import { RecordButton } from "../components/RecordButton";
import { TopBar } from "../components/TopBar";
import { BERKANE_VS_FES, type BattleResult, type Side } from "../data/battles";
import { useBattle } from "../hooks/useBattle";
import { useCamera } from "../hooks/useCamera";
import { useRecorder, type RecordingResult } from "../hooks/useRecorder";
import { useRenderLoop } from "../hooks/useRenderLoop";
import { IDLE_TAKE, useTake, type Take } from "../hooks/useTake";
import { DECISION_MS, createBattleRenderer, type BattleScene } from "../utils/battleRenderer";
import { getBrowserSupport } from "../utils/browserSupport";

const battle = BERKANE_VS_FES;

function buildScene(take: Take, results: readonly BattleResult[]): BattleScene {
  return {
    phase: take.phase,
    battle,
    results,
    countdownValue: take.countdown,
    phaseStartedAt: take.startedAt
  };
}

interface BattleStudioProps {
  /** Re-open the camera immediately (used after "retake"). */
  autoStartCamera: boolean;
  onFinished: (result: RecordingResult) => void;
  onHome: () => void;
}

/**
 * Team Battle: camera + microphone are recorded under a graphics layer. Every round shows two
 * players face to face; tapping one scores for its team while the user comments out loud.
 */
export function BattleStudio({ autoStartCamera, onFinished, onHome }: BattleStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [support] = useState(getBrowserSupport);
  const [locked, setLocked] = useState(false);

  const camera = useCamera(videoRef);
  const recorder = useRecorder(onFinished);
  const game = useBattle(battle);
  const cameraReady = camera.state === "ready";

  const { take, begin, abort } = useTake({
    canvasRef,
    stream: camera.stream,
    cameraReady,
    recorder,
    isComplete: game.isComplete,
    completeDelayMs: DECISION_MS,
    resetProgress: game.reset
  });

  const sceneRef = useRef<BattleScene>(buildScene(IDLE_TAKE, []));
  useEffect(() => {
    sceneRef.current = buildScene(take, game.results);
  }, [take, game.results]);

  useRenderLoop(
    canvasRef,
    (canvas) => {
      const video = videoRef.current;
      if (!video) throw new Error("Camera element is not mounted");
      return createBattleRenderer(canvas, video, battle);
    },
    sceneRef
  );

  useEffect(() => {
    if (autoStartCamera) void camera.start();
    // Only on mount.
  }, []);

  // The canvas keeps showing the decided round for DECISION_MS; ignore taps until the next one appears.
  useEffect(() => {
    if (!locked) return;
    const id = window.setTimeout(() => setLocked(false), DECISION_MS);
    return () => window.clearTimeout(id);
  }, [locked]);

  useEffect(() => {
    if (take.phase !== "playing") setLocked(false);
  }, [take.phase]);

  function choose(side: Side) {
    if (locked) return;
    game.choose(side);
    setLocked(true);
  }

  const round = game.currentRound;
  const canChoose = take.phase === "playing" && !locked && round !== null;
  const message = camera.error || recorder.error;

  return (
    <main className="app">
      <section className="studio">
        <CameraView videoRef={videoRef} />
        <canvas ref={canvasRef} className="stage" />

        <TopBar isRecording={recorder.isRecording} />

        {/* Invisible tap targets laid over the two players on the canvas (team A left, team B right). */}
        {canChoose && (
          <div className="pick-zones">
            <button type="button" className="pick-zone pick-zone--left" aria-label={`اختر ${round.a.name}`} onClick={() => choose("a")} />
            <button type="button" className="pick-zone pick-zone--right" aria-label={`اختر ${round.b.name}`} onClick={() => choose("b")} />
          </div>
        )}

        {take.phase === "playing" && (
          <button type="button" className="abort abort--bottom" onClick={abort}>
            إلغاء
          </button>
        )}

        {take.phase === "idle" && cameraReady && (
          <div className="dock">
            <RecordButton onClick={begin} />
            <p className="dock__hint">عدّ تنازلي 3 ثوانٍ، ثم اضغط على اللاعب الأفضل وعلّق بصوتك</p>
            <button type="button" className="link-button" onClick={onHome}>تغيير القالب</button>
          </div>
        )}

        {message && take.phase === "idle" && cameraReady && <p className="notice">{message}</p>}

        {!cameraReady && (
          <CameraGate
            title="بطل 2025 ضد بطل 2026"
            state={camera.state}
            error={support.issue ?? (message || null)}
            blocked={Boolean(support.issue)}
            onStart={() => void camera.start()}
            onHome={onHome}
          />
        )}
      </section>
    </main>
  );
}
