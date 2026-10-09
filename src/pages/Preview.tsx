import { useState } from "react";
import type { RecordingResult } from "../hooks/useRecorder";
import { saveVideo } from "../utils/videoRecorder";

interface PreviewProps {
  recording: RecordingResult;
  filenameBase: string;
  onRetake: () => void;
  onHome: () => void;
}

export function Preview({ recording, filenameBase, onRetake, onHome }: PreviewProps) {
  const [status, setStatus] = useState("");

  async function handleSave() {
    setStatus("");
    try {
      await saveVideo(recording.blob, `${filenameBase}.${recording.extension}`);
      setStatus("تم الحفظ.");
    } catch {
      setStatus("تعذر حفظ الفيديو. جرّب مرة أخرى.");
    }
  }

  return (
    <main className="app">
      <section className="studio studio--preview">
        <video className="preview__video" src={recording.url} controls playsInline />
        <div className="preview__actions">
          <button type="button" className="btn" onClick={onRetake}>
            إعادة التصوير
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void handleSave()}>
            حفظ الفيديو
          </button>
        </div>
        <p className="preview__status" role="status">{status}</p>
        <button type="button" className="link-button preview__home" onClick={onHome}>
          القوالب
        </button>
      </section>
    </main>
  );
}
