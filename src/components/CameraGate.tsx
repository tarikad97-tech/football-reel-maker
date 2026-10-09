import type { CameraState } from "../hooks/useCamera";

interface CameraGateProps {
  title: string;
  state: CameraState;
  error: string | null;
  /** True when the browser cannot work at all (no HTTPS, no MediaRecorder…). */
  blocked: boolean;
  onStart: () => void;
  onHome: () => void;
}

export function CameraGate({ title, state, error, blocked, onStart, onHome }: CameraGateProps) {
  return (
    <div className="gate">
      <h1 className="gate__title">{title}</h1>
      <p className="gate__text">نحتاج الكاميرا والميكروفون لتسجيل الفيديو. لا يُرفع شيء، كل شيء يبقى على جهازك.</p>
      {error && <p className="gate__error" role="alert">{error}</p>}
      <button type="button" className="cta" onClick={onStart} disabled={state === "requesting" || blocked}>
        {state === "requesting" ? "جاري التشغيل..." : "تشغيل الكاميرا والميكروفون"}
      </button>
      <button type="button" className="link-button" onClick={onHome}>
        تغيير القالب
      </button>
    </div>
  );
}
