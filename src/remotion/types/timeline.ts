/**
 * CLIPSO.AI — Director IA Timeline Schema
 *
 * Este es el contrato de datos entre la IA de análisis (GPT-4o)
 * y el motor de renderizado Remotion. Cada campo es requerido para
 * garantizar un renderizado determinista.
 */

// ─── PRIMITIVOS ──────────────────────────────────────────────────────────────

export type AnimationStyle = "bounce" | "shake" | "highlight" | "slide_left" | "slide_right" | "fade";
export type SfxType = "pop" | "swoosh" | "impact" | "ding" | "riser_short" | "riser_long" | "impact_low" | "impact_high" | "boom" | "notification" | "whoosh" | "click_soft";
export type ColorGrading = "cinematico" | "vibrante" | "minimalista" | "oscuro" | "neutral";
export type CaptionPreset = "tiktok_yellow" | "mrbeast_bold" | "minimal_clean" | "neon_cyber" | "comic_pop" | "elegant_serif" | "energetic_orange";
export type MotionGraphicType = "title_card" | "text_pop" | "lower_third" | "counter" | "call_out" | "zoom_shake_text" | "highlight_box" | "arrow_pointer" | "progress_bar";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

/** Frame exacto en el video (30fps = 1s → frame 30) */
export type Frame = number;

/** Coordenadas normalizadas [0, 1] relativas al viewport */
export interface NormalizedPosition {
  x: number; // 0 = izquierda, 1 = derecha
  y: number; // 0 = arriba, 1 = abajo
}

// ─── SPRING CONFIG ────────────────────────────────────────────────────────────

/**
 * Parámetros del resorte físico.
 * Remotion usa react-spring internamente con estos parámetros.
 * - stiffness: qué tan rígido (100 = suave, 300 = rígido/snap)
 * - damping: amortiguación (8 = mucho rebote, 30 = sin rebote)
 * - mass: inercia (1 = default, >1 = más lento y pesado)
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const SPRING_PRESETS = {
  /** Rebote pronunciado — para punchlines y CTAs */
  aggressive: { stiffness: 400, damping: 10, mass: 0.8 } satisfies SpringConfig,
  /** Rebote profesional — para MG y overlays de impacto */
  standard: { stiffness: 250, damping: 18, mass: 1.0 } satisfies SpringConfig,
  /** Rebote suave — para captions y elementos informativos */
  smooth: { stiffness: 160, damping: 24, mass: 1.2 } satisfies SpringConfig,
  /** Sin rebote — para lower thirds y elementos de presentación */
  gentle: { stiffness: 120, damping: 30, mass: 1.0 } satisfies SpringConfig,
} as const;

// ─── PISTA 1: VIDEO PRINCIPAL ────────────────────────────────────────────────

export interface ZoomEvent {
  /** Frame exacto de inicio del zoom punch-in */
  startFrame: Frame;
  /** Escala pico (1.0 = 100%, 1.18 = 18% de zoom) */
  scalePeak: number;
  /** Frames de entrada (easing ease-out) */
  framesIn: number;
  /** Frames en el pico (hold) */
  framesHold: number;
  /** Frames de salida (easing ease-in) */
  framesOut: number;
  /** Importancia [0, 1] — calibra el SFX asociado */
  importanceScore: number;
}

export interface VideoTrack {
  /** URL o ruta al archivo de video fuente */
  src: string;
  /** Duración total en frames */
  durationFrames: Frame;
  /** Grading de color aplicado como CSS filter */
  colorGrading: ColorGrading;
  /** Eventos de zoom punch-in ordenados por startFrame */
  zoomEvents: ZoomEvent[];
  /** Si se aplican jump cuts (eliminar silencios) */
  applyJumpCuts: boolean;
  /** Resolución final */
  aspectRatio: AspectRatio;
}

// ─── PISTA 2: TEXTO / SUBTÍTULOS ─────────────────────────────────────────────

export interface WordToken {
  /** Texto de la palabra (case original de la transcripción) */
  word: string;
  /** Frame de inicio según Whisper */
  startFrame: Frame;
  /** Frame de fin según Whisper */
  endFrame: Frame;
  /** Score de importancia semántica [0, 1] */
  importanceScore: number;
  /** Estilo de animación individual (override del chunk) */
  animationStyle?: AnimationStyle;
  /** Si esta palabra debe disparar un SFX */
  requiresSfx: boolean;
  sfxType?: SfxType;
}

export interface CaptionChunk {
  /** ID único del chunk */
  id: string;
  /** Texto completo del chunk (2-4 palabras) */
  text: string;
  /** Palabras individuales con sus metadatos */
  words: WordToken[];
  /** Frame de inicio del chunk */
  startFrame: Frame;
  /** Frame de fin del chunk */
  endFrame: Frame;
  /** Tamaño de fuente como % del viewport height [2, 12] */
  fontSizePct: number;
  /** Color hex del texto base */
  baseColor: string;
  /** Color hex de la palabra resaltada */
  highlightColor: string;
  /** Estilo de animación de entrada del chunk */
  animationStyle: AnimationStyle;
  /** Configuración del resorte (override del preset) */
  springConfig?: SpringConfig;
  /** Si este chunk es un momento de énfasis */
  isEmphasis: boolean;
  /** Score de importancia del chunk [0, 1] */
  importanceScore: number;
  /** Rotación de entrada en grados (−3 a 3) */
  entryRotation?: number;
}

export interface TextTrack {
  /** Preset visual del estilo de captions */
  preset: CaptionPreset;
  /** Todos los chunks de captions ordenados por startFrame */
  chunks: CaptionChunk[];
  /** Palabras clave a resaltar (match case-insensitive) */
  highlightKeywords: string[];
  /** Posición vertical del área de captions [0, 1] */
  verticalPosition: number; // 0.72 = bottom_third en 9:16
}

// ─── PISTA 3: OVERLAYS / GRÁFICOS ────────────────────────────────────────────

export type OverlayAssetType =
  | "motion_graphic"     // title_card, text_pop, etc.
  | "broll_image"        // imagen DALL-E generada
  | "icon_popup"         // icono SVG/PNG emergente
  | "lower_third"        // barra de presentación
  | "text_overlay";      // texto corto MAYÚSCULAS

export interface BaseOverlay {
  id: string;
  type: OverlayAssetType;
  /** Frame exacto de aparición */
  startFrame: Frame;
  /** Duración en frames */
  durationFrames: Frame;
  /** Posición normalizada del centro del elemento */
  position: NormalizedPosition;
  /** Animación de entrada */
  animationStyle: AnimationStyle;
  /** Config del resorte de entrada */
  springConfig: SpringConfig;
  /** Importancia [0, 1] — calibra el SFX */
  importanceScore: number;
  /** SFX sincronizado con la aparición */
  sfxSync?: SfxType;
}

export interface MotionGraphicOverlay extends BaseOverlay {
  type: "motion_graphic";
  graphicType: MotionGraphicType;
  text: string;
  color: string;
  /** Tamaño de fuente como % del vh */
  fontSizePct: number;
}

export interface BrollImageOverlay extends BaseOverlay {
  type: "broll_image";
  /** URL de la imagen generada por DALL-E */
  imageUrl: string;
  /** Modo de display: fullscreen o picture-in-picture */
  displayMode: "fullscreen" | "pip";
  /** Opacidad [0, 1] */
  opacity: number;
}

export interface IconPopupOverlay extends BaseOverlay {
  type: "icon_popup";
  /** URL del SVG o PNG del icono */
  iconUrl: string;
  /** Tamaño del icono como % del viewport width */
  sizePct: number;
}

export interface TextOverlayItem extends BaseOverlay {
  type: "text_overlay";
  text: string;        // 1-3 palabras MAYÚSCULAS
  color: string;
  fontSizePct: number;
}

export interface LowerThirdOverlay extends BaseOverlay {
  type: "lower_third";
  title: string;
  subtitle?: string;
}

export type AnyOverlay =
  | MotionGraphicOverlay
  | BrollImageOverlay
  | IconPopupOverlay
  | TextOverlayItem
  | LowerThirdOverlay;

export interface OverlayTrack {
  overlays: AnyOverlay[];
}

// ─── PISTA 4: AUDIO / SFX ────────────────────────────────────────────────────

export interface SfxEvent {
  id: string;
  /** Archivo del SFX en /public/sfx/ */
  sfxType: SfxType;
  /** Frame exacto de disparo */
  startFrame: Frame;
  /** Volumen [0, 1] */
  volume: number;
  /** Trigger que lo generó (para debug) */
  trigger: "zoom" | "overlay" | "emphasis" | "keyword" | "manual";
}

export interface MusicTrack {
  /** Archivo en /public/music/ (null = sin música) */
  trackName: string | null;
  /** Volumen [0, 1] — normalmente 0.08-0.12 */
  volume: number;
  /** Fade-in en frames */
  fadeInFrames: number;
  /** Fade-out en frames */
  fadeOutFrames: number;
}

export interface AmbientTrack {
  /** Archivo en /public/ambient/ */
  trackName: string;
  /** Volumen muy bajo [0.03, 0.08] para textura premium */
  volume: number;
}

export interface AudioTrack {
  sfxEvents: SfxEvent[];
  music: MusicTrack;
  ambient: AmbientTrack;
}

// ─── TIMELINE COMPLETO (contrato con GPT-4o) ─────────────────────────────────

/**
 * DirectorTimeline — El JSON completo que la IA devuelve al frontend.
 * Este objeto es el único input que necesita <TimelineComposer /> para
 * renderizar un video completamente editado.
 */
export interface DirectorTimeline {
  /** Versión del schema — para compatibilidad futura */
  schemaVersion: "4.0";
  /** ID del job de procesamiento */
  jobId: string;
  /** Metadatos del video */
  meta: {
    title: string;
    tone: "energico" | "calmado" | "informativo" | "emotivo" | "divertido" | "profesional";
    pace: "rapido" | "medio" | "lento";
    summary: string;
    language: string;
    durationFrames: Frame;
    fps: 30 | 60;
    aspectRatio: AspectRatio;
  };
  /** Las 4 pistas del timeline */
  tracks: {
    video: VideoTrack;
    text: TextTrack;
    overlays: OverlayTrack;
    audio: AudioTrack;
  };
}
