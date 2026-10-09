import { useEffect, type RefObject } from "react";

interface Renderer<S> {
  draw(scene: S, now: number): void;
  dispose(): void;
}

/**
 * Runs a canvas renderer every animation frame. The scene is read from a ref,
 * so React re-renders never restart the loop.
 */
export function useRenderLoop<S>(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  create: (canvas: HTMLCanvasElement) => Renderer<S>,
  sceneRef: RefObject<S>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = create(canvas);
    let frame = requestAnimationFrame(function loop() {
      renderer.draw(sceneRef.current, performance.now());
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
    // Created once per mount; later renders only change the scene ref.
  }, []);
}
