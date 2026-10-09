import type { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

/**
 * The raw camera feed. It is never shown directly: the canvas copies each frame
 * from it. It stays in the layout (1px, transparent) because some mobile browsers
 * stop updating video frames for display:none elements.
 */
export function CameraView({ videoRef }: CameraViewProps) {
  return <video ref={videoRef} className="camera-source" muted playsInline autoPlay />;
}
