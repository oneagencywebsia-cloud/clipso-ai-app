/**
 * TimelineComposer — El motor de renderizado principal de CLIPSO.AI.
 *
 * Recibe un DirectorTimeline (JSON del Director IA) y orquesta las 4 pistas:
 *   1. VideoTrack → <OffthreadVideo> con zoom punch-ins calculados por frame
 *   2. TextTrack → <CaptionRenderer> con spring kinetic typography per-chunk
 *   3. OverlayTrack → <SpringAsset> wrappea cada overlay con físicas de resorte
 *   4. AudioTrack → <Audio> sincronizado por startFrame
 *
 * Arquitectura de capas (z-index):
 *   0: Video principal (color-graded)
 *   10: B-roll fullscreen overlays
 *   20: Motion graphics (title cards, counters, lower thirds)
 *   30: Icon popups y text overlays
 *   40: Captions / subtítulos
 *   50: Debug overlay (solo en dev)
 */
"use client";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { SpringAsset } from "./SpringAsset";
import { CaptionRenderer } from "./CaptionRenderer";
import { useZoomPunchIn } from "../hooks/useZoomPunchIn";
import { useColorGrading } from "../hooks/useColorGrading";
import {
  DirectorTimeline,
  AnyOverlay,
  SfxEvent,
  SPRING_PRESETS,
} from "../types/timeline";

interface TimelineComposerProps {
  timeline: DirectorTimeline;
  /** Modo debug: muestra frames y z-index de cada capa */
  debug?: boolean;
}

export const TimelineComposer: React.FC<TimelineComposerProps> = ({
  timeline,
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tracks, meta } = timeline;

  // ── PISTA 1: VIDEO con zoom punch-ins ──────────────────────────────────────
  const zoomTransform = useZoomPunchIn(tracks.video.zoomEvents, frame, fps);
  const gradingFilter = useColorGrading(tracks.video.colorGrading);

  // ── PISTA 4: AUDIO — Pre-calcular SFX únicos por startFrame ───────────────
  // Remotion require que cada <Audio> tenga un key estático para no re-montar
  const sfxEvents = useMemo(
    () => tracks.audio.sfxEvents.sort((a, b) => a.startFrame - b.startFrame),
    [tracks.audio.sfxEvents]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── LAYER 0: Video principal ───────────────────────────────────────── */}
      <AbsoluteFill style={{ zIndex: 0 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: zoomTransform,
            filter: gradingFilter,
            // willChange en el contenedor — Remotion renderiza frame a frame
            willChange: "transform, filter",
          }}
        >
          <OffthreadVideo
            src={tracks.video.src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </AbsoluteFill>

      {/* ── LAYER 10-40: Overlays (B-roll, MGs, Iconos, Textos) ────────────── */}
      {tracks.overlays.overlays.map((overlay) => (
        <OverlayRenderer
          key={overlay.id}
          overlay={overlay}
          fps={fps}
          debug={debug}
        />
      ))}

      {/* ── LAYER 40: Captions con kinetic typography ─────────────────────── */}
      <AbsoluteFill style={{ zIndex: 40 }}>
        <CaptionRenderer
          track={tracks.text}
          currentFrame={frame}
          fps={fps}
        />
      </AbsoluteFill>

      {/* ── LAYER 50: Debug overlay ────────────────────────────────────────── */}
      {debug && (
        <AbsoluteFill
          style={{
            zIndex: 50,
            pointerEvents: "none",
            padding: 16,
          }}
        >
          <div style={{ color: "#0f0", fontFamily: "monospace", fontSize: 14 }}>
            Frame: {frame} | FPS: {fps} | Overlays: {tracks.overlays.overlays.length}
          </div>
        </AbsoluteFill>
      )}

      {/* ── AUDIO: Música de fondo ─────────────────────────────────────────── */}
      {tracks.audio.music.trackName && (
        <Audio
          src={`/music/${tracks.audio.music.trackName}.mp3`}
          volume={(f) => {
            const totalFrames = meta.durationFrames;
            const fadeIn = tracks.audio.music.fadeInFrames;
            const fadeOut = tracks.audio.music.fadeOutFrames;
            const baseVol = tracks.audio.music.volume;

            if (f < fadeIn) return baseVol * (f / fadeIn);
            if (f > totalFrames - fadeOut)
              return baseVol * ((totalFrames - f) / fadeOut);
            return baseVol;
          }}
        />
      )}

      {/* ── AUDIO: Ambient de textura ──────────────────────────────────────── */}
      {tracks.audio.ambient.trackName && (
        <Audio
          src={`/ambient/${tracks.audio.ambient.trackName}.mp3`}
          volume={tracks.audio.ambient.volume}
        />
      )}

      {/* ── AUDIO: SFX sincronizados por startFrame ────────────────────────── */}
      {sfxEvents.map((sfx) => (
        <SfxRenderer key={sfx.id} event={sfx} />
      ))}
    </AbsoluteFill>
  );
};

// ─── SUB-RENDERERS ────────────────────────────────────────────────────────────

/**
 * OverlayRenderer — Renderiza un overlay dentro de un Sequence y lo envuelve
 * en SpringAsset para la animación de entrada.
 *
 * Resuelve la superposición de un asset gráfico (ej. icono emergente) sobre
 * el video principal sincronizado con un SFX en el frame exacto.
 */
const OverlayRenderer: React.FC<{
  overlay: AnyOverlay;
  fps: number;
  debug?: boolean;
}> = ({ overlay, fps, debug }) => {
  const zIndexMap: Record<string, number> = {
    broll_image: 10,
    motion_graphic: 20,
    lower_third: 20,
    icon_popup: 30,
    text_overlay: 30,
  };

  const zIndex = zIndexMap[overlay.type] ?? 25;

  // Seleccionar preset de spring según animationStyle e importanceScore
  const springConfig =
    overlay.springConfig ??
    (overlay.importanceScore >= 0.85
      ? SPRING_PRESETS.aggressive
      : overlay.importanceScore >= 0.65
      ? SPRING_PRESETS.standard
      : SPRING_PRESETS.smooth);

  return (
    <Sequence
      from={overlay.startFrame}
      durationInFrames={overlay.durationFrames}
      layout="none"
    >
      <AbsoluteFill style={{ zIndex, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: `${overlay.position.x * 100}%`,
            top: `${overlay.position.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <SpringAsset
            startFrame={0} // relativo al Sequence — frame 0 = overlay.startFrame absoluto
            springConfig={springConfig}
            animationStyle={overlay.animationStyle}
            initialRotation={overlay.importanceScore >= 0.82 ? -2.5 : 0}
          >
            <OverlayContent overlay={overlay} />
          </SpringAsset>

          {debug && (
            <div
              style={{
                position: "absolute",
                top: -20,
                left: 0,
                color: "#ff0",
                fontSize: 10,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              [{overlay.type}] z={zIndex} importance={overlay.importanceScore}
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* SFX sincronizado — se dispara en frame 0 del Sequence (= startFrame absoluto) */}
      {overlay.sfxSync && (
        <Audio
          src={`/sfx/${overlay.sfxSync}.mp3`}
          volume={0.3 + overlay.importanceScore * 0.25}
          startFrom={0}
          endAt={Math.ceil(fps * 0.5)} // Máx 0.5s de SFX
        />
      )}
    </Sequence>
  );
};

/** Contenido visual del overlay según su tipo */
const OverlayContent: React.FC<{ overlay: AnyOverlay }> = ({ overlay }) => {
  switch (overlay.type) {
    case "motion_graphic":
    case "text_overlay":
      return (
        <div
          style={{
            fontFamily: "Impact, sans-serif",
            fontSize: `${overlay.fontSizePct}vh`,
            color: overlay.color,
            textShadow: "0 0 20px rgba(0,0,0,0.8), 4px 4px 8px rgba(0,0,0,0.9)",
            WebkitTextStroke: "2px rgba(0,0,0,0.6)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {overlay.text.toUpperCase()}
        </div>
      );

    case "broll_image":
      return (
        <img
          src={overlay.imageUrl}
          style={{
            width: overlay.displayMode === "fullscreen" ? "100vw" : "40vw",
            height: "auto",
            borderRadius: overlay.displayMode === "pip" ? 16 : 0,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            opacity: overlay.opacity,
          }}
          alt=""
        />
      );

    case "icon_popup":
      return (
        <img
          src={overlay.iconUrl}
          style={{
            width: `${overlay.sizePct}vw`,
            height: "auto",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
          }}
          alt=""
        />
      );

    case "lower_third":
      return (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
            padding: "16px 32px 16px 24px",
            borderLeft: "4px solid #FFFF00",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ color: "#fff", fontSize: "4vh", fontWeight: 900, fontFamily: "Arial Black, sans-serif" }}>
            {overlay.title}
          </div>
          {overlay.subtitle && (
            <div style={{ color: "#ccc", fontSize: "2.5vh", fontWeight: 400, marginTop: 4 }}>
              {overlay.subtitle}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

/** SFX Renderer — Dispara un audio puntual en el frame exacto usando Sequence */
const SfxRenderer: React.FC<{ event: SfxEvent }> = ({ event }) => (
  <Sequence from={event.startFrame} durationInFrames={60} layout="none">
    <Audio
      src={`/sfx/${event.sfxType}.mp3`}
      volume={event.volume}
      startFrom={0}
    />
  </Sequence>
);
