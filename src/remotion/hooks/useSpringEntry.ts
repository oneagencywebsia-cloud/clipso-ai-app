/**
 * useSpringEntry — Hook de físicas de resorte para Remotion.
 *
 * Calcula los valores animados de scale, opacity y translateY
 * usando la función spring() nativa de Remotion (que internamente
 * resuelve la ecuación diferencial de resorte amortiguado:
 *   x''(t) + 2ζω x'(t) + ω² x(t) = ω² · target
 * donde ζ = damping/(2√(stiffness·mass)) y ω = √(stiffness/mass)
 *
 * A diferencia de lerp() o easeOut(), spring() produce overshoot
 * natural si damping es bajo — exactamente el "rebote profesional"
 * que distingue motion graphics premium de animaciones básicas.
 */
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SpringConfig, SPRING_PRESETS } from "../types/timeline";

export interface SpringEntryValues {
  /** Scale del elemento [0, 1+overshoot] → se estabiliza en 1 */
  scale: number;
  /** Opacidad [0, 1] */
  opacity: number;
  /** Desplazamiento vertical en px (entra desde abajo) */
  translateY: number;
  /** Rotación en grados [entry_rotation, 0] */
  rotateZ: number;
  /** True cuando la animación alcanzó el 99% de su target */
  isSettled: boolean;
}

export interface UseSpringEntryOptions {
  /** Frame absoluto en el que comienza la animación */
  startFrame: number;
  /** Configuración del resorte */
  springConfig?: SpringConfig;
  /** Desplazamiento Y inicial en px (cuánto desciende desde arriba) */
  initialOffsetY?: number;
  /** Rotación inicial en grados (se anima hacia 0) */
  initialRotation?: number;
  /** Si false, el elemento no aparece hasta startFrame */
  preload?: boolean;
}

export function useSpringEntry({
  startFrame,
  springConfig = SPRING_PRESETS.standard,
  initialOffsetY = 40,
  initialRotation = 0,
  preload = false,
}: UseSpringEntryOptions): SpringEntryValues {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // No renderar antes del frame de inicio
  const relativeFrame = Math.max(0, frame - startFrame);
  const isActive = preload || frame >= startFrame;

  if (!isActive) {
    return { scale: 0, opacity: 0, translateY: initialOffsetY, rotateZ: initialRotation, isSettled: false };
  }

  // spring() de Remotion: resuelve la ODE en cada frame
  const progress = spring({
    frame: relativeFrame,
    fps,
    config: springConfig,
    // durationInFrames es opcional — spring() converge naturalmente
    // pero lo limitamos para no desperdiciar cómputo
    durationInFrames: Math.ceil(fps * 1.2), // 1.2s máx
  });

  // Scale: overshoot natural del resorte
  // progress va de 0→1 con posible overshoot (>1) si damping bajo
  const scale = progress;

  // Opacity: fade-in rápido (lineal, independiente del resorte)
  const opacity = Math.min(1, relativeFrame / Math.max(1, fps * 0.08)); // 0→1 en 2.4 frames

  // translateY: entra desde initialOffsetY hasta 0
  const translateY = initialOffsetY * (1 - progress);

  // rotateZ: entra desde initialRotation hasta 0
  const rotateZ = initialRotation * (1 - progress);

  // Consideramos "settled" cuando el progreso supera 0.99
  const isSettled = progress >= 0.99;

  return { scale, opacity, translateY, rotateZ, isSettled };
}
