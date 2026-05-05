import { DirectorTimeline, SPRING_PRESETS } from "./types/timeline";

/**
 * Mock de 5 segundos a 30fps (150 frames).
 * Cubre todas las variantes del schema v5.0 para testing visual.
 */
export const mockTimeline: DirectorTimeline = {
  schemaVersion: "5.0",
  jobId: "mock-job-001",

  meta: {
    title: "Demo CLIPSO.AI — 5s Test",
    tone: "energico",
    pace: "rapido",
    summary: "Vídeo de prueba del motor Remotion con todos los tracks activos.",
    language: "es",
    durationFrames: 150,
    fps: 30,
    aspectRatio: "9:16",
  },

  tracks: {
    // ── PISTA 1: VIDEO ────────────────────────────────────────────────────────
    video: {
      src: "/mock/video_source.mp4",
      durationFrames: 150,
      colorGrading: "vibrante",
      applyJumpCuts: false,
      aspectRatio: "9:16",
      zoomEvents: [
        {
          startFrame: 30,      // t = 1.0s
          scalePeak: 1.18,     // 18% punch-in agresivo
          framesIn: 7,         // 0.23s ease-out entrada
          framesHold: 18,      // 0.6s en el pico
          framesOut: 7,        // 0.23s ease-in salida
          importanceScore: 9,
        },
        {
          startFrame: 105,     // t = 3.5s — segundo punch en el CTA
          scalePeak: 1.12,
          framesIn: 6,
          framesHold: 15,
          framesOut: 6,
          importanceScore: 7,
        },
      ],
    },

    // ── PISTA 2: TEXTO / SUBTÍTULOS ───────────────────────────────────────────
    text: {
      preset: "tiktok_yellow",
      highlightKeywords: ["IMPOSIBLE", "AHORA"],
      verticalPosition: 0.72,
      chunks: [
        {
          id: "chunk-001",
          text: "ESTO ES",
          words: [
            {
              word: "ESTO",
              startFrame: 0,
              endFrame: 15,
              importanceScore: 3,
              requiresSfx: false,
            },
            {
              word: "ES",
              startFrame: 15,
              endFrame: 30,
              importanceScore: 2,
              requiresSfx: false,
            },
          ],
          startFrame: 0,
          endFrame: 30,
          fontSizePct: 7.5,
          baseColor: "#FFFFFF",
          highlightColor: "#FFFF00",
          animationStyle: "slide",
          isEmphasis: false,
          importanceScore: 3,
          entryRotation: 0,
        },
        {
          id: "chunk-002",
          text: "IMPOSIBLE",
          words: [
            {
              word: "IMPOSIBLE",
              startFrame: 30,
              endFrame: 75,
              importanceScore: 10,
              animationStyle: "pop",
              requiresSfx: true,
              sfxType: "impact_high",
            },
          ],
          startFrame: 30,
          endFrame: 75,
          fontSizePct: 7.5,              // el motor aplica × 1.35 por isEmphasis → ~10.1vh
          baseColor: "#FFFFFF",
          highlightColor: "#FF3333",
          animationStyle: "pop",
          springConfig: SPRING_PRESETS.aggressive,
          isEmphasis: true,
          importanceScore: 10,
          entryRotation: -2.5,
        },
        {
          id: "chunk-003",
          text: "HAZLO AHORA",
          words: [
            {
              word: "HAZLO",
              startFrame: 75,
              endFrame: 110,
              importanceScore: 6,
              requiresSfx: false,
            },
            {
              word: "AHORA",
              startFrame: 110,
              endFrame: 150,
              importanceScore: 9,
              animationStyle: "pop",
              requiresSfx: true,
              sfxType: "boom",
            },
          ],
          startFrame: 75,
          endFrame: 150,
          fontSizePct: 7.5,
          baseColor: "#FFFFFF",
          highlightColor: "#FFFF00",
          animationStyle: "bounce",
          springConfig: SPRING_PRESETS.standard,
          isEmphasis: false,
          importanceScore: 8,
          entryRotation: -1.5,
        },
      ],
    },

    // ── PISTA 3: OVERLAYS ─────────────────────────────────────────────────────
    overlays: {
      overlays: [
        // MotionGraphicOverlay — title card al inicio
        {
          id: "overlay-001",
          type: "motion_graphic",
          graphicType: "title_card",
          startFrame: 0,
          durationFrames: 28,
          position: { x: 0.5, y: 0.22 },
          animationStyle: "pop",
          springConfig: SPRING_PRESETS.aggressive,
          importanceScore: 9,
          sfxSync: "whoosh",
          text: "CLIPSO.AI",
          color: "#FFFF00",
          fontSizePct: 9,
        },
        // LowerThirdOverlay — presentación de persona/concepto
        {
          id: "overlay-002",
          type: "lower_third",
          startFrame: 45,
          durationFrames: 60,
          position: { x: 0.5, y: 0.82 },
          animationStyle: "slide",
          springConfig: SPRING_PRESETS.gentle,
          importanceScore: 6,
          sfxSync: "swoosh",
          title: "Motor de Edición IA",
          subtitle: "Powered by GPT-4o + Remotion",
          accentColor: "#FFFF00",
        },
        // BrollImageOverlay — imagen de soporte en picture-in-picture
        {
          id: "overlay-003",
          type: "broll_image",
          startFrame: 90,
          durationFrames: 45,
          position: { x: 0.75, y: 0.30 },
          animationStyle: "bounce",
          springConfig: SPRING_PRESETS.standard,
          importanceScore: 7,
          sfxSync: "pop",
          imageUrl: "/mock/broll_placeholder.jpg",
          displayMode: "pip",
          opacity: 0.92,
        },
      ],
    },

    // ── PISTA 4: AUDIO ────────────────────────────────────────────────────────
    audio: {
      sfxEvents: [
        {
          id: "sfx-001",
          sfxType: "boom",
          startFrame: 0,
          volume: 0.55,
          trigger: "manual",
        },
        {
          id: "sfx-002",
          sfxType: "whoosh",
          startFrame: 30,      // sincronizado con ZoomEvent frame 30
          volume: 0.42,
          trigger: "zoom",
        },
        {
          id: "sfx-003",
          sfxType: "impact_high",
          startFrame: 30,      // sincronizado con chunk "IMPOSIBLE"
          volume: 0.65,
          trigger: "emphasis",
        },
        {
          id: "sfx-004",
          sfxType: "riser_short",
          startFrame: 90,      // buildup 0.5s antes del CTA
          volume: 0.50,
          trigger: "manual",
        },
        {
          id: "sfx-005",
          sfxType: "boom",
          startFrame: 110,     // "AHORA"
          volume: 0.60,
          trigger: "keyword",
        },
      ],
      music: {
        trackName: "upbeat_energetic",
        volume: 0.10,
        fadeInFrames: 30,
        fadeOutFrames: 45,
      },
      ambient: {
        trackName: "tiktok_ambient_beat",
        volume: 0.06,
      },
    },
  },
};
