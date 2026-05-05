"use client";

import React, { useCallback, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { mockTimeline } from "../mockTimeline";
import { TimelineComposer } from "./TimelineComposer";
import { DirectorTimeline } from "../types/timeline";

// ─── COMPOSICIÓN RAÍZ ────────────────────────────────────────────────────────

/**
 * ClipsoComposition — Composición que Remotion renderiza frame a frame.
 * Recibe el timeline como inputProps desde <Player> y lo pasa a TimelineComposer.
 */
const ClipsoComposition: React.FC<{ timeline: DirectorTimeline }> = ({
  timeline,
}) => <TimelineComposer timeline={timeline} />;

// ─── DIMENSIONES POR ASPECT RATIO ────────────────────────────────────────────

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
};

// ─── PLAYER COMPONENT ────────────────────────────────────────────────────────

interface ClipsoPlayerProps {
  /** Timeline a reproducir. Por defecto usa mockTimeline para desarrollo. */
  timeline?: DirectorTimeline;
  /** Si true, muestra el overlay de debug de TimelineComposer. */
  debug?: boolean;
}

export const ClipsoPlayer: React.FC<ClipsoPlayerProps> = ({
  timeline = mockTimeline,
  debug = false,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const { fps, durationFrames, aspectRatio } = timeline.meta;
  const { width, height } = DIMENSIONS[aspectRatio] ?? DIMENSIONS["9:16"];

  // Escala el canvas al 35% para caber en el panel lateral del editor
  const DISPLAY_SCALE = 0.35;
  const displayWidth  = Math.round(width  * DISPLAY_SCALE);
  const displayHeight = Math.round(height * DISPLAY_SCALE);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying]);

  const handleSeekStart = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const frame = Number(e.target.value);
      playerRef.current?.seekTo(frame);
      setCurrentFrame(frame);
    },
    []
  );

  const formatTime = (frame: number) => {
    const total = frame / fps;
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-slate-900 min-h-screen">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Preview
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {aspectRatio} · {fps}fps · {(durationFrames / fps).toFixed(1)}s
        </span>
      </div>

      {/* ── CANVAS ──────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden ring-1 ring-slate-700/60 shadow-2xl shadow-black/60"
        style={{ width: displayWidth, height: displayHeight }}
      >
        {/* Viñeta decorativa premium */}
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        <Player
          ref={playerRef}
          component={ClipsoComposition}
          inputProps={{ timeline: { ...timeline, meta: { ...timeline.meta } } }}
          durationInFrames={durationFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          style={{ width: displayWidth, height: displayHeight }}
          showVolumeControls={false}
          controls={false}
          loop
          onFrameUpdate={(f) => setCurrentFrame(f)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* ── CONTROLS ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 rounded-xl bg-slate-800/70 border border-slate-700/50 backdrop-blur-sm p-4"
        style={{ width: displayWidth }}
      >
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-yellow-400 tabular-nums w-10 shrink-0">
            {formatTime(currentFrame)}
          </span>

          <input
            type="range"
            min={0}
            max={durationFrames - 1}
            value={currentFrame}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onChange={handleSeekChange}
            className="
              w-full h-1 appearance-none rounded-full cursor-pointer
              bg-slate-600
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-yellow-400
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb:active]:cursor-grabbing
            "
            style={{
              background: `linear-gradient(to right, #facc15 ${(currentFrame / (durationFrames - 1)) * 100}%, #475569 0%)`,
            }}
          />

          <span className="text-xs font-mono text-slate-500 tabular-nums w-10 shrink-0 text-right">
            {formatTime(durationFrames - 1)}
          </span>
        </div>

        {/* Play / Pause */}
        <div className="flex items-center justify-center gap-4">
          {/* Retroceder 10 frames */}
          <button
            onClick={() => {
              const f = Math.max(0, currentFrame - 10);
              playerRef.current?.seekTo(f);
              setCurrentFrame(f);
            }}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Retroceder 10 frames"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
            </svg>
          </button>

          {/* Play / Pause principal */}
          <button
            onClick={handlePlayPause}
            className="
              flex items-center justify-center w-10 h-10 rounded-full
              bg-yellow-400 hover:bg-yellow-300
              text-slate-900 font-bold
              transition-all duration-150 active:scale-95
              shadow-lg shadow-yellow-400/30
            "
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Avanzar 10 frames */}
          <button
            onClick={() => {
              const f = Math.min(durationFrames - 1, currentFrame + 10);
              playerRef.current?.seekTo(f);
              setCurrentFrame(f);
            }}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Avanzar 10 frames"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── METADATA PANEL ──────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-2 text-center"
        style={{ width: displayWidth }}
      >
        {[
          { label: "Tone",    value: timeline.meta.tone },
          { label: "Pace",    value: timeline.meta.pace },
          { label: "Chunks",  value: `${timeline.tracks.text.chunks.length}` },
          { label: "Zooms",   value: `${timeline.tracks.video.zoomEvents.length}` },
          { label: "Overlays",value: `${timeline.tracks.overlays.overlays.length}` },
          { label: "SFX",     value: `${timeline.tracks.audio.sfxEvents.length}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg bg-slate-800/60 border border-slate-700/40 px-2 py-2"
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              {label}
            </p>
            <p className="text-sm font-semibold text-slate-200 capitalize mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── SCHEMA VERSION ──────────────────────────────────────────────────── */}
      <p className="text-[10px] font-mono text-slate-600">
        schema {timeline.schemaVersion} · job {timeline.jobId}
      </p>
    </div>
  );
};
