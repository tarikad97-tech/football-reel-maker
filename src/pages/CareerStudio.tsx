import { useEffect, useRef, useState } from "react";
import { CameraGate } from "../components/CameraGate";
import { CameraView } from "../components/CameraView";
import { RecordButton } from "../components/RecordButton";
import { TopBar } from "../components/TopBar";
import { startClubs } from "../career/clubs";
import { POS_LABEL, acceptOffer, newCareer, runChapter, type Career, type Chapter, type Offer, type Pos } from "../career/engine";
import { useCamera } from "../hooks/useCamera";
import { useRecorder, type RecordingResult } from "../hooks/useRecorder";
import { useRenderLoop } from "../hooks/useRenderLoop";
import { useTake } from "../hooks/useTake";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../utils/canvasRenderer";
import { CHAPTER_MS, FOCUS_OPTIONS, PICK_MS, createCareerRenderer, layoutFor, type CareerScene, type Stage } from "../utils/careerRenderer";
import { getBrowserSupport } from "../utils/browserSupport";
import { Sfx } from "../utils/sfx";

interface Film {
  stage: Stage;
  stageStartedAt: number;
  career: Career | null;
  chapter: Chapter | null;
  offers: readonly Offer[];
  picked: number | null;
  pickedAt: number;
  done: boolean;
}

const freshFilm = (): Film => ({ stage: "club", stageStartedAt: performance.now(), career: null, chapter: null, offers: [], picked: null, pickedAt: 0, done: false });

interface Props {
  autoStartCamera: boolean;
  onFinished: (result: RecordingResult) => void;
  onHome: () => void;
}

/**
 * Career Legend: camera + mic (+ synthesised effects) are recorded under an animated graphics layer.
 * The user picks the first club, a career focus, then every big transfer decision from 17 to 38.
 */
export function CareerStudio({ autoStartCamera, onFinished, onHome }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [support] = useState(getBrowserSupport);
  const [name, setName] = useState("لاعب مغربي");
  const [pos, setPos] = useState<Pos>("W");
  const [film, setFilm] = useState<Film>(freshFilm);
  const filmRef = useRef(film);
  filmRef.current = film;

  const camera = useCamera(videoRef);
  const recorder = useRecorder(onFinished);
  const cameraReady = camera.state === "ready";

  // Mic + effects mixed into one audio stream that goes into the recording.
  const [sfx, setSfx] = useState<Sfx | null>(null);
  useEffect(() => {
    if (!camera.stream) return;
    let s: Sfx;
    try { s = new Sfx(camera.stream); } catch { return; }
    setSfx(s);
    return () => { s.close(); setSfx(null); };
  }, [camera.stream]);

  const { take, begin, abort } = useTake({
    canvasRef,
    stream: sfx ? sfx.stream : camera.stream,
    cameraReady,
    recorder,
    isComplete: film.done,
    completeDelayMs: 0,
    resetProgress: () => setFilm(freshFilm())
  });

  const sceneRef = useRef<CareerScene>({
    phase: "idle", countdownValue: 3, phaseStartedAt: 0, stage: "club", stageStartedAt: 0,
    career: null, chapter: null, offers: [], picked: null, pickedAt: 0, name, pos
  });
  useEffect(() => {
    sceneRef.current = {
      phase: take.phase, countdownValue: take.countdown, phaseStartedAt: take.startedAt, stage: film.stage,
      stageStartedAt: film.stageStartedAt, career: film.career, chapter: film.chapter, offers: film.offers,
      picked: film.picked, pickedAt: film.pickedAt, name, pos
    };
  }, [take, film, name, pos]);

  useRenderLoop(
    canvasRef,
    (canvas) => {
      const video = videoRef.current;
      if (!video) throw new Error("Camera element is not mounted");
      return createCareerRenderer(canvas, video);
    },
    sceneRef
  );

  useEffect(() => {
    if (autoStartCamera) void camera.start();
    // Only on mount.
  }, []);

  function enterChapter(career: Career, chapter: Chapter, offers: readonly Offer[]) {
    setFilm({ stage: "chapter", stageStartedAt: performance.now(), career, chapter, offers, picked: null, pickedAt: 0, done: false });
    sfx?.whoosh();
    if (chapter.trophies > 0) window.setTimeout(() => sfx?.cheer(), 500);
    if (chapter.events.some((e) => e.includes("🥇"))) window.setTimeout(() => sfx?.whistle(), 900);
  }

  function choose(i: number) {
    if (film.picked !== null || take.phase !== "playing") return;
    sfx?.resume();
    sfx?.pick();
    setFilm({ ...film, picked: i, pickedAt: performance.now() });
  }

  // After the highlight, move on to the next stage.
  useEffect(() => {
    if (film.picked === null) return;
    const id = window.setTimeout(() => {
      const f = filmRef.current;
      const i = f.picked;
      if (i === null) return;
      if (f.stage === "club") {
        const career = newCareer(name, pos, startClubs[i].id);
        setFilm({ ...f, stage: "focus", stageStartedAt: performance.now(), career, picked: null });
        sfx?.whoosh();
      } else if (f.stage === "focus" && f.career) {
        const r = runChapter({ ...f.career, focus: FOCUS_OPTIONS[i].id });
        enterChapter(r.career, r.chapter, r.offers);
      } else if (f.stage === "offers" && f.career) {
        const r = runChapter(acceptOffer(f.career, f.offers[i]));
        enterChapter(r.career, r.chapter, r.offers);
      }
    }, PICK_MS);
    return () => window.clearTimeout(id);
  }, [film.picked]);

  // A chapter plays on its own, then shows the next decision or ends the career.
  useEffect(() => {
    if (film.stage !== "chapter" || take.phase !== "playing") return;
    const id = window.setTimeout(() => {
      const f = filmRef.current;
      if (f.chapter?.ended) setFilm({ ...f, done: true });
      else setFilm({ ...f, stage: "offers", stageStartedAt: performance.now() });
      sfx?.whoosh();
    }, CHAPTER_MS);
    return () => window.clearTimeout(id);
  }, [film.stage, film.stageStartedAt, take.phase]);

  useEffect(() => {
    if (take.phase === "final") sfx?.win();
    if (take.phase === "countdown") sfx?.tick();
  }, [take.phase, take.countdown]);

  const count = film.stage === "club" ? startClubs.length : film.stage === "focus" ? FOCUS_OPTIONS.length : film.offers.length;
  const zones = take.phase === "playing" && film.stage !== "chapter" && film.picked === null ? layoutFor(film.stage, count) : [];
  const message = camera.error || recorder.error;

  function start() {
    sfx?.resume();
    begin();
  }

  return (
    <main className="app">
      <section className="studio">
        <CameraView videoRef={videoRef} />
        <canvas ref={canvasRef} className="stage" />
        <TopBar isRecording={recorder.isRecording} />

        {zones.map((r, i) => (
          <button
            key={`${film.stage}-${i}`}
            type="button"
            className="zone"
            aria-label={`خيار ${i + 1}`}
            style={{
              left: `${(r.x / CANVAS_WIDTH) * 100}%`, top: `${(r.y / CANVAS_HEIGHT) * 100}%`,
              width: `${(r.w / CANVAS_WIDTH) * 100}%`, height: `${(r.h / CANVAS_HEIGHT) * 100}%`
            }}
            onClick={() => choose(i)}
          />
        ))}

        {take.phase === "playing" && <button type="button" className="abort abort--bottom" onClick={abort}>إلغاء</button>}

        {take.phase === "idle" && cameraReady && (
          <div className="dock">
            <input className="cs-input" value={name} maxLength={22} aria-label="اسم اللاعب" onChange={(e) => setName(e.target.value)} />
            <div className="cs-chips">
              {(Object.keys(POS_LABEL) as Pos[]).map((p) => (
                <button key={p} type="button" className={`cs-chip ${pos === p ? "is-on" : ""}`} onClick={() => setPos(p)}>{POS_LABEL[p]}</button>
              ))}
            </div>
            <RecordButton onClick={start} />
            <p className="dock__hint">اختر ناديك من 10 أندية مغربية، ثم قرارات مسيرتك حتى الاعتزال، وعلّق بصوتك</p>
            <button type="button" className="link-button" onClick={onHome}>تغيير القالب</button>
          </div>
        )}

        {message && take.phase === "idle" && cameraReady && <p className="notice">{message}</p>}

        {!cameraReady && (
          <CameraGate
            title="طريق الأسطورة"
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
