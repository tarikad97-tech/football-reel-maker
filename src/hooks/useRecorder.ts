import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_BITS_PER_SECOND,
  VIDEO_BITS_PER_SECOND,
  createRecordingStream,
  extensionForMime,
  pickMimeType
} from "../utils/videoRecorder";

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: "webm" | "mp4";
}

export function useRecorder(onComplete: (result: RecordingResult) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const start = useCallback((canvas: HTMLCanvasElement, micStream: MediaStream | null): boolean => {
    setError("");
    try {
      const mimeType = pickMimeType();
      const stream = createRecordingStream(canvas, micStream);
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND
      });

      chunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        discardRef.current = true;
        setError("حدث خطأ أثناء التسجيل.");
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.onstop = () => {
        // Only the canvas track belongs to us; the microphone track stays with the camera stream.
        stream.getVideoTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setIsRecording(false);

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (discardRef.current) return;
        if (chunks.length === 0) {
          setError("لم يتم تسجيل أي بيانات. أعد المحاولة.");
          return;
        }

        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunks, { type });
        onCompleteRef.current({
          blob,
          url: URL.createObjectURL(blob),
          mimeType: type,
          extension: extensionForMime(type)
        });
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? `تعذر بدء التسجيل: ${e.message}` : "تعذر بدء التسجيل.");
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  /** Stops recording and throws the footage away. */
  const cancel = useCallback(() => {
    discardRef.current = true;
    stop();
  }, [stop]);

  useEffect(() => cancel, [cancel]);

  return { isRecording, error, start, stop, cancel };
}
