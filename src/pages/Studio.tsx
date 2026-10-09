import { useEffect, useRef, useState } from "react";
import { CameraGate } from "../components/CameraGate";
import { CameraView } from "../components/CameraView";
import { PlayerCard } from "../components/PlayerCard";
import { ProgressBar } from "../components/ProgressBar";
import { RecordButton } from "../components/RecordButton";
import { TopBar } from "../components/TopBar";
import { players } from "../data/players";
import { RANK_5, type RankedPick } from "../data/templates";
import { useCamera } from "../hooks/useCamera";
import { useRanking } from "../hooks/useRanking";
import { useRecorder, type RecordingResult } from "../hooks/useRecorder";
import { useRenderLoop } from "../hooks/useRenderLoop";
import { IDLE_TAKE, useTake, type Take } from "../hooks/useTake";
import { getBrowserSupport } from "../utils/browserSupport";
import { PICK_MOMENT_MS, createCanvasRenderer, type Scene } from "../utils/canvasRenderer";

function buildScene(take: Take, picks: readonly RankedPick[]): Scene {
  return {
    phase: take.phase,
    question: RANK_5.question,
    totalRanks: RANK_5.slots,
    rankLabels: RANK_5.rankLabels,
    picks,
    countdownValue: take.countdown,
    phaseStartedAt: take.startedAt
  };
}

interface StudioProps {
  /** Re-open the camera immediately (used after "retake"). */
  autoStartCamera: boolean;
  onFinished: (result: RecordingResult) => void;
  onHome: () => void;
}

/** Rank 5: the user ranks their top 5 players while recording. */
export function Studio({ autoStartCamera, onFinished, onHome }: StudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [support] = useState(getBrowserSupport);

  const camera = useCamera(videoRef);
  const recorder = useRecorder(onFinished);
  const ranking = useRanking(players, RANK_5.slots);
  const cameraReady = camera.state === "ready";

  const { take, begin, abort } = useTake({
    canvasRef,
    stream: camera.stream,
    cameraReady,
    recorder,
    isComplete: ranking.isComplete,
    completeDelayMs: PICK_MOMENT_MS,
    resetProgress: ranking.reset
  });

  const sceneRef = useRef<Scene>(buildScene(IDLE_TAKE, []));
  useEffect(() => {
    sceneRef.current = buildScene(take, ranking.picks);
  }, [take, ranking.picks]);

  useRenderLoop(
    canvasRef,
    (canvas) => {
      const video = videoRef.current;
      if (!video) throw new Error("Camera element is not mounted");
      return createCanvasRenderer(canvas, video, players);
    },
    sceneRef
  );

  useEffect(() => {
    if (autoStartCamera) void camera.start();
    // Only on mount.
  }, []);

  const message = camera.error || recorder.error;
  const playing = take.phase === "playing";

  return (
    <main className="app">
      <section className="studio">
        <CameraView videoRef={videoRef} />
        <canvas ref={canvasRef} className="stage" />

        <TopBar isRecording={recorder.isRecording} />

        {playing && (
          <div className="progress-wrap">
            <ProgressBar total={RANK_5.slots} filled={ranking.picks.length} />
          </div>
        )}
        {playing && (
          <button type="button" className="abort" onClick={abort}>
            إلغاء
          </button>
        )}

        {playing && !ranking.isComplete && (
          <div className="tray" aria-label={`اختر المرتبة ${RANK_5.rankLabels[ranking.currentRank - 1]}`}>
            {ranking.availablePlayers.map((player) => (
              <PlayerCard key={player.id} player={player} onSelect={ranking.select} />
            ))}
          </div>
        )}

        {take.phase === "idle" && cameraReady && (
          <div className="dock">
            <RecordButton onClick={begin} />
            <p className="dock__hint">عدّ تنازلي 3 ثوانٍ ثم يبدأ التسجيل</p>
            <button type="button" className="link-button" onClick={onHome}>تغيير القالب</button>
          </div>
        )}

        {message && take.phase === "idle" && cameraReady && <p className="notice">{message}</p>}

        {!cameraReady && (
          <CameraGate
            title="رتب أفضل 5 لاعبين"
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
