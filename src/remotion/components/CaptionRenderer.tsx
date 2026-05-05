/**
 * CaptionRenderer — Renderiza captions con kinetic typography per-chunk.
 *
 * Por cada CaptionChunk activo en el frame actual:
 *   - Aplica spring con la intensidad correcta según importanceScore
 *   - Resalta keywords con color diferente
 *   - En chunks de énfasis: tamaño mayor + animación más agresiva
 *   - Rotación de entrada si importanceScore >= 0.82
 */
"use client";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SpringAsset } from "./SpringAsset";
import { TextTrack, CaptionChunk, SPRING_PRESETS } from "../types/timeline";

interface CaptionRendererProps {
  track: TextTrack;
  currentFrame: number;
  fps: number;
}

export const CaptionRenderer: React.FC<CaptionRendererProps> = ({
  track,
  currentFrame,
  fps,
}) => {
  // Solo renderizar el chunk activo en el frame actual
  const activeChunk = track.chunks.find(
    (chunk) =>
      currentFrame >= chunk.startFrame && currentFrame < chunk.endFrame
  );

  if (!activeChunk) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: `${(1 - track.verticalPosition) * 100}%`,
        paddingLeft: "12%",
        paddingRight: "12%",
      }}
    >
      <ChunkDisplay
        chunk={activeChunk}
        highlightKeywords={track.highlightKeywords}
        fps={fps}
      />
    </AbsoluteFill>
  );
};

const ChunkDisplay: React.FC<{
  chunk: CaptionChunk;
  highlightKeywords: string[];
  fps: number;
}> = ({ chunk, highlightKeywords, fps }) => {
  const keywordsUpper = new Set(highlightKeywords.map((k) => k.toUpperCase()));

  // Spring config: énfasis usa aggressive, importancia alta usa standard
  const springConfig =
    chunk.springConfig ??
    (chunk.isEmphasis
      ? SPRING_PRESETS.aggressive
      : chunk.importanceScore >= 8
      ? SPRING_PRESETS.standard
      : SPRING_PRESETS.smooth);

  // Rotación de entrada solo para chunks de alto impacto
  const initialRotation =
    chunk.entryRotation ??
    (chunk.importanceScore >= 8 ? -2.5 : 0);

  const fontSize = `${chunk.fontSizePct}vh`;

  return (
    <SpringAsset
      startFrame={0} // relativo — el padre Sequence gestiona el frame absoluto
      springConfig={springConfig}
      animationStyle={chunk.animationStyle}
      initialRotation={initialRotation}
      initialOffsetY={chunk.isEmphasis ? 30 : 20}
      style={{ textAlign: "center", maxWidth: "100%" }}
    >
      <div
        style={{
          fontFamily: chunk.isEmphasis
            ? "Impact, Arial Black, sans-serif"
            : "Arial Black, Impact, sans-serif",
          fontSize,
          lineHeight: 1.1,
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.15em",
        }}
      >
        {chunk.text.split(" ").map((word, idx) => {
          const clean = word.replace(/[.,;:!?¿¡()\[\]"']/g, "").toUpperCase();
          const isKeyword = keywordsUpper.has(clean);
          const wordData = chunk.words[idx];
          const wordImportance = wordData?.importanceScore ?? chunk.importanceScore;

          return (
            <span
              key={idx}
              style={{
                color: isKeyword ? chunk.highlightColor : chunk.baseColor,
                // Texto con outline — máxima legibilidad en cualquier fondo
                textShadow: [
                  `-3px -3px 0 #000`,
                  `3px -3px 0 #000`,
                  `-3px 3px 0 #000`,
                  `3px 3px 0 #000`,
                  `0 0 20px rgba(0,0,0,0.8)`,
                ].join(", "),
                WebkitTextStroke: chunk.isEmphasis ? "2px rgba(0,0,0,0.5)" : "1px rgba(0,0,0,0.3)",
                // Escala extra para palabras de alta importancia individual
                display: "inline-block",
                transform: wordImportance >= 9 ? "scale(1.08)" : "scale(1)",
                transformOrigin: "center bottom",
              }}
            >
              {word.toUpperCase()}
            </span>
          );
        })}
      </div>
    </SpringAsset>
  );
};
