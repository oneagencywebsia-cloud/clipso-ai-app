/**
 * SpringAsset — HOC (Higher-Order Component) de físicas de resorte.
 *
 * Envuelve CUALQUIER elemento hijo y aplica una animación de entrada
 * tipo spring (rebote físico real, no interpolación lineal).
 *
 * Uso:
 *   <SpringAsset startFrame={60} springConfig={SPRING_PRESETS.aggressive} initialRotation={-2}>
 *     <MyIcon />
 *   </SpringAsset>
 *
 * El componente:
 *   1. Oculta el hijo hasta startFrame (opacity=0, scale=0)
 *   2. En startFrame: aplica la ODE de resorte con overshoot
 *   3. Se estabiliza en scale=1, opacity=1, rotation=0
 *
 * Performance: usa transform CSS (GPU-composited) — no produce reflow.
 */
"use client";
import React from "react";
import { AbsoluteFill } from "remotion";
import { useSpringEntry, UseSpringEntryOptions } from "../hooks/useSpringEntry";
import { AnimationStyle } from "../types/timeline";

interface SpringAssetProps extends UseSpringEntryOptions {
  children: React.ReactNode;
  /** Clase CSS adicional para el wrapper */
  className?: string;
  /** Estilo CSS adicional para el wrapper */
  style?: React.CSSProperties;
  /** Modo de animación — override del spring para estilos específicos */
  animationStyle?: AnimationStyle;
}

export const SpringAsset: React.FC<SpringAssetProps> = ({
  children,
  className,
  style,
  animationStyle = "bounce",
  ...springOptions
}) => {
  // Override springConfig según animationStyle si no se pasó uno explícito
  const resolvedOptions: UseSpringEntryOptions = {
    ...springOptions,
  };

  if (!springOptions.springConfig) {
    if (animationStyle === "bounce") {
      resolvedOptions.springConfig = { stiffness: 250, damping: 18, mass: 1.0 };
    } else if (animationStyle === "shake") {
      // Shake: muy rígido para que el overshoot sea inmediato
      resolvedOptions.springConfig = { stiffness: 500, damping: 8, mass: 0.5 };
      resolvedOptions.initialOffsetY = 0;
    } else if (animationStyle === "highlight") {
      // Highlight: suave, sin overshoot
      resolvedOptions.springConfig = { stiffness: 120, damping: 28, mass: 1.2 };
      resolvedOptions.initialOffsetY = 15;
    } else if (animationStyle === "slide") {
      resolvedOptions.springConfig = { stiffness: 200, damping: 22, mass: 1.0 };
      resolvedOptions.initialOffsetY = 0;
    } else if (animationStyle === "fade") {
      resolvedOptions.springConfig = { stiffness: 80, damping: 30, mass: 1.5 };
      resolvedOptions.initialOffsetY = 0;
    }
  }

  const { scale, opacity, translateY, rotateZ } = useSpringEntry(resolvedOptions);

  // Shake: oscila en X en lugar de escalar (simula impacto horizontal)
  const isShake = animationStyle === "shake";

  const transform = isShake
    ? `translateX(${(1 - scale) * 20}px) scale(${Math.max(0.001, scale)})`
    : `translateY(${translateY}px) scale(${Math.max(0.001, scale)}) rotate(${rotateZ}deg)`;

  return (
    <div
      className={className}
      style={{
        opacity,
        transform,
        willChange: "transform, opacity",
        // GPU acceleration explícita — crítico para renderizado Remotion
        backfaceVisibility: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
