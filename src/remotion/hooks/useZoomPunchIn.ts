/**
 * useZoomPunchIn — Calcula el transform CSS de zoom para el frame actual.
 *
 * Para cada ZoomEvent, genera una curva de zoom en 3 fases:
 *   1. Entrada (framesIn): easeOutCubic — entra rápido, desacelera
 *   2. Hold (framesHold): scale máximo, sin cambio
 *   3. Salida (framesOut): easeInCubic — aceleración suave hacia 1.0
 *
 * Si varios ZoomEvents se solapan en el tiempo, toma el máximo scale.
 * El resultado es un string CSS `scale(X)` listo para aplicar en transform.
 */
import { ZoomEvent } from "../types/timeline";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Calcula el scale factor [1.0, scalePeak] para un ZoomEvent dado en el frame actual.
 * Retorna 1.0 si el frame está fuera del rango del evento.
 */
function calcZoomScale(event: ZoomEvent, frame: number): number {
  const { startFrame, scalePeak, framesIn, framesHold, framesOut } = event;
  const endFrameIn = startFrame + framesIn;
  const endFrameHold = endFrameIn + framesHold;
  const endFrameOut = endFrameHold + framesOut;

  if (frame < startFrame || frame > endFrameOut) return 1.0;

  if (frame <= endFrameIn) {
    // Fase entrada: 1.0 → scalePeak con easeOutCubic
    const t = (frame - startFrame) / framesIn;
    return 1.0 + (scalePeak - 1.0) * easeOutCubic(t);
  }

  if (frame <= endFrameHold) {
    // Fase hold: scalePeak constante
    return scalePeak;
  }

  // Fase salida: scalePeak → 1.0 con easeInCubic
  const t = (frame - endFrameHold) / framesOut;
  return scalePeak - (scalePeak - 1.0) * easeInCubic(t);
}

export function useZoomPunchIn(
  zoomEvents: ZoomEvent[],
  frame: number,
  _fps: number
): string {
  if (!zoomEvents.length) return "scale(1)";

  // Evaluar todos los eventos y tomar el máximo scale (por si se solapan)
  const scales = zoomEvents.map((event) => calcZoomScale(event, frame));
  const maxScale = Math.max(1.0, ...scales);

  if (maxScale <= 1.001) return "scale(1)";
  return `scale(${maxScale.toFixed(4)})`;
}
