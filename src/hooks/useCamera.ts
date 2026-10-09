import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { getBrowserSupport } from "../utils/browserSupport";

export type CameraState = "idle" | "requesting" | "ready" | "error";

const PREFERRED_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    frameRate: { ideal: 30 }
  },
  audio: { echoCancellation: true, noiseSuppression: true }
};

function describeError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "تم رفض الإذن. اسمح بالوصول إلى الكاميرا والميكروفون من إعدادات المتصفح ثم أعد المحاولة.";
    case "NotFoundError":
      return "لم يتم العثور على كاميرا أو ميكروفون في هذا الجهاز.";
    case "NotReadableError":
    case "AbortError":
      return "الكاميرا أو الميكروفون مستخدم من تطبيق آخر. أغلقه ثم أعد المحاولة.";
    default:
      return e instanceof Error && e.message ? e.message : "تعذر تشغيل الكاميرا.";
  }
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  /** Incremented on every start/stop so a late getUserMedia result can be recognised as stale. */
  const requestRef = useRef(0);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [videoRef]);

  const stop = useCallback(() => {
    requestRef.current++;
    release();
    setState("idle");
  }, [release]);

  const start = useCallback(async () => {
    const support = getBrowserSupport();
    if (support.issue) {
      setError(support.issue);
      setState("error");
      return;
    }

    const request = ++requestRef.current;
    release();
    setError("");
    setState("requesting");

    try {
      let media: MediaStream;
      try {
        media = await navigator.mediaDevices.getUserMedia(PREFERRED_CONSTRAINTS);
      } catch (e) {
        if (e instanceof DOMException && e.name === "OverconstrainedError") {
          media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          throw e;
        }
      }

      if (request !== requestRef.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = media;
      video.srcObject = media;
      await video.play();

      media.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current !== media) return;
        release();
        setError("انقطع الاتصال بالكاميرا.");
        setState("error");
      });

      setStream(media);
      setState("ready");
    } catch (e) {
      if (request !== requestRef.current) return;
      release();
      setError(describeError(e));
      setState("error");
    }
  }, [release, videoRef]);

  useEffect(() => {
    return () => {
      requestRef.current++;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { state, error, stream, start, stop };
}
