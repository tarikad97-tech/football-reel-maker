export interface BrowserSupport {
  /** null when everything needed is available, otherwise an Arabic explanation. */
  issue: string | null;
}

/** `needsCamera: false` is for templates that only record the canvas (no getUserMedia). */
export function getBrowserSupport(needsCamera = true): BrowserSupport {
  if (needsCamera && !window.isSecureContext) {
    return {
      issue: "الكاميرا تعمل فقط عبر HTTPS أو localhost. افتح الموقع من رابط آمن."
    };
  }
  if (needsCamera && !navigator.mediaDevices?.getUserMedia) {
    return { issue: "هذا المتصفح لا يدعم الوصول إلى الكاميرا والميكروفون." };
  }
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    return { issue: "هذا المتصفح لا يدعم تسجيل الفيديو. جرّب Chrome أو Safari حديث." };
  }
  return { issue: null };
}
