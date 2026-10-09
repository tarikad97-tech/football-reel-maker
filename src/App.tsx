import { useEffect, useState } from "react";
import type { RecordingResult } from "./hooks/useRecorder";
import { CareerStudio } from "./pages/CareerStudio";
import { BattleStudio } from "./pages/BattleStudio";
import { Home, type TemplateId } from "./pages/Home";
import { Preview } from "./pages/Preview";
import { Studio } from "./pages/Studio";

export function App() {
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);

  // Free the video blob whenever it is replaced, discarded, or the app unmounts.
  useEffect(() => {
    if (!recording) return;
    return () => URL.revokeObjectURL(recording.url);
  }, [recording]);

  function handleFinished(result: RecordingResult) {
    setHasRecorded(true);
    setRecording(result);
  }

  function goHome() {
    setRecording(null);
    setHasRecorded(false);
    setTemplate(null);
  }

  if (!template) return <Home onSelect={setTemplate} />;

  if (recording) {
    return (
      <Preview
        recording={recording}
        filenameBase={`football-reel-${template}`}
        onRetake={() => setRecording(null)}
        onHome={goHome}
      />
    );
  }

  const studioProps = { autoStartCamera: hasRecorded, onFinished: handleFinished, onHome: goHome };
  if (template === "rank-5") return <Studio {...studioProps} />;
  return template === "career" ? <CareerStudio {...studioProps} /> : <BattleStudio {...studioProps} />;
}
