/**
 * CLIPSO.AI — Director Timeline Schema v5.0
 *
 * Contrato de datos estricto entre el JSON del Director IA (GPT-4o)
 * y el motor de renderizado <TimelineComposer /> en Remotion.
 *
 * Convenciones:
 *   - Frame: número entero absoluto desde t=0. A 30fps, 1s = frame 30.
 *   - importanceScore: entero [1, 10]. Determina agresividad visual y SFX.
 *   - Todas las interfaces de Overlay usan unión discriminada por `type`.
 *   - Ningún campo es opcional en el nivel raíz — la IA DEBE rellenarlos todos.
 */

// ─── PRIMITIVOS GLOBALES ──────────────────────────────────────────────────────

/** Unidad temporal. Entero absoluto desde el frame 0 del video. */
export type Frame = number;

/**
 * Estilo de animación de entrada.
 * El motor de Remotion mapea cada valor a un preset de spring físico distinto:
 *   pop       → spring aggressive (stiffness 400, damping 10) — snap inmediato con rebote
 *   bounce    → spring standard  (stiffness 250, damping 18) — rebote profesional
 *   slide     → spring smooth    (stiffness 160, damping 24) — deslizamiento suave
 *   shake     → oscillación X decreciente (no spring, simula impacto físico)
 *   highlight → spring gentle    (stiffness 120, damping 30) — énfasis sin rebote
 *   fade      → spring ultra-suave + opacity únicamente
 */
export type AnimationStyle =
  | "pop"
  | "bounce"
  | "slide"
  | "shake"
  | "highlight"
  | "fade";

/** Tipos de SFX disponibles en /public/sfx/. */
export type SfxType =
  | "click_soft"
  | "pop"
  | "swoosh"
  | "whoosh"
  | "whoosh_long"
  | "impact_low"
  | "impact_high"
  | "riser_short"
  | "riser_long"
  | "ding"
  | "boom"
  | "notification";

/** Filtros de color grade. El motor los traduce a CSS filter strings. */
export type ColorGrading =
  | "cinematico"   // contrast(1.18) saturate(0.85) brightness(0.96)
  | "vibrante"     // contrast(1.12) saturate(1.35) brightness(1.02)
  | "minimalista"  // contrast(1.05) saturate(0.75) brightness(1.04)
  | "oscuro"       // contrast(1.25) saturate(0.90) brightness(0.88)
  | "neutral";     // sin filtro

/** Preset visual de los captions. Determina fuente, colores y outline. */
export type CaptionPreset =
  | "tiktok_yellow"
  | "mrbeast_bold"
  | "minimal_clean"
  | "neon_cyber"
  | "comic_pop"
  | "elegant_serif"
  | "energetic_orange";

/** Tipos de motion graphics pre-construidos en el motor. */
export type MotionGraphicType =
  | "title_card"
  | "text_pop"
  | "lower_third"
  | "counter"
  | "call_out"
  | "zoom_shake_text"
  | "highlight_box"
  | "arrow_pointer"
  | "progress_bar";

/** Relación de aspecto del output final. */
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

/** Posición normalizada [0, 1] relativa al viewport. (0,0) = top-left. */
export interface NormalizedPosition {
  x: number;
  y: number;
}

// ─── SPRING CONFIG ────────────────────────────────────────────────────────────

/**
 * Parámetros físicos del resorte.
 * Remotion los pasa directamente a su función spring() que resuelve la ODE:
 *   x''(t) + 2ζω·x'(t) + ω²·x(t) = ω²·target
 * donde ζ = damping/(2√(stiffness·mass)), ω = √(stiffness/mass).
 * ζ < 1 produce overshoot (rebote). ζ >= 1 es critically/overdamped (sin rebote).
 */
export interface SpringConfig {
  /** Rigidez del resorte. Mayor = más snappy. Rango recomendado: [80, 500]. */
  stiffness: number;
  /** Amortiguación. Menor = más rebote. Rango recomendado: [8, 35]. */
  damping: number;
  /** Masa. Mayor = más inercia y movimiento más lento. Rango: [0.5, 2.0]. */
  mass: number;
}

/**
 * Presets de resorte listos para usar.
 * El motor selecciona uno automáticamente según importanceScore si no se override.
 */
export const SPRING_PRESETS = {
  /** importanceScore 9-10: snap con rebote máximo. Punchlines, CTAs. */
  aggressive: { stiffness: 400, damping: 10, mass: 0.8 } satisfies SpringConfig,
  /** importanceScore 7-8: rebote profesional. Motion graphics, énfasis. */
  standard:   { stiffness: 250, damping: 18, mass: 1.0 } satisfies SpringConfig,
  /** importanceScore 5-6: entrada suave con rebote ligero. Captions normales. */
  smooth:     { stiffness: 160, damping: 24, mass: 1.2 } satisfies SpringConfig,
  /** importanceScore 1-4: sin rebote. Lower thirds, información de soporte. */
  gentle:     { stiffness: 120, damping: 30, mass: 1.0 } satisfies SpringConfig,
} as const;

/** Selecciona el preset automático según importanceScore [1, 10]. */
export function resolveSpringPreset(score: number): SpringConfig {
  if (score >= 9) return SPRING_PRESETS.aggressive;
  if (score >= 7) return SPRING_PRESETS.standard;
  if (score >= 5) return SPRING_PRESETS.smooth;
  return SPRING_PRESETS.gentle;
}

// ─── PISTA 1: VIDEO ──────────────────────────────────────────────────────────

/**
 * ZoomEvent — Punch-in digital sobre el video principal.
 *
 * El motor calcula el scale factor en cada frame con tres fases:
 *   [startFrame, startFrame+framesIn]       → easeOutCubic: 1.0 → scalePeak
 *   [startFrame+framesIn, ...+framesHold]   → hold: scalePeak constante
 *   [...+framesHold, ...+framesOut]         → easeInCubic: scalePeak → 1.0
 *
 * Si varios ZoomEvents se solapan, el motor toma max(scale) por frame.
 */
export interface ZoomEvent {
  /** Frame absoluto de inicio del punch-in. */
  startFrame: Frame;
  /** Escala pico. 1.0 = sin zoom. 1.18 = 18% de zoom. Rango: [1.02, 1.25]. */
  scalePeak: number;
  /** Frames de entrada con easing ease-out. Recomendado: 6-9 (0.2-0.3s a 30fps). */
  framesIn: number;
  /** Frames en el pico sin cambio. Recomendado: 12-21 (0.4-0.7s). */
  framesHold: number;
  /** Frames de salida con easing ease-in. Recomendado: 6-9. */
  framesOut: number;
  /**
   * Importancia del momento [1, 10].
   * Calibra el volumen del SFX de whoosh asociado: score 5 → vol 0.30, score 10 → vol 0.65.
   */
  importanceScore: number;
}

export interface VideoTrack {
  /** URL del video fuente (R2, S3, o ruta pública). */
  src: string;
  /** Duración total del video en frames. Debe ser coherente con meta.durationFrames. */
  durationFrames: Frame;
  /** Color grade aplicado como CSS filter sobre el <OffthreadVideo>. */
  colorGrading: ColorGrading;
  /** Punch-ins ordenados por startFrame ASC. El motor no re-ordena. */
  zoomEvents: ZoomEvent[];
  /** Si true, el motor aplica cortes en los silencios detectados por Whisper. */
  applyJumpCuts: boolean;
  /** Relación de aspecto del canvas Remotion y del output final. */
  aspectRatio: AspectRatio;
}

// ─── PISTA 2: TEXTO / SUBTÍTULOS ─────────────────────────────────────────────

/**
 * WordToken — Metadatos de una palabra individual de la transcripción.
 *
 * Permite animaciones y SFX a nivel de palabra, no solo de chunk.
 * El motor usa requiresSfx para disparar un click_soft automático.
 */
export interface WordToken {
  /** Texto original tal como lo devuelve Whisper. */
  word: string;
  /** Frame de inicio de la palabra según timestamps de Whisper. */
  startFrame: Frame;
  /** Frame de fin de la palabra. */
  endFrame: Frame;
  /**
   * Importancia semántica de la palabra [1, 10].
   * 1-3: relleno. 4-6: contexto. 7-8: relevante. 9-10: clave del mensaje.
   * El motor escala la palabra un 8% extra si score >= 9.
   */
  importanceScore: number;
  /**
   * Override de animación individual.
   * Si está ausente, hereda el animationStyle del CaptionChunk padre.
   */
  animationStyle?: AnimationStyle;
  /** Si true, dispara un SFX en startFrame de esta palabra. */
  requiresSfx: boolean;
  /** Tipo de SFX. Solo relevante si requiresSfx = true. */
  sfxType?: SfxType;
}

/**
 * CaptionChunk — Fragmento de 2-4 palabras que aparece simultáneamente en pantalla.
 *
 * El motor renderiza un chunk por frame, activando el chunk cuyo
 * startFrame <= currentFrame < endFrame.
 *
 * La animación de entrada usa spring() con los parámetros de springConfig
 * (o el preset calculado por resolveSpringPreset(importanceScore) si ausente).
 */
export interface CaptionChunk {
  /** UUID v4 generado por la IA. Usado como React key. */
  id: string;
  /** Texto plano del chunk (2-4 palabras). Usado para layout y debug. */
  text: string;
  /** Palabras individuales con sus metadatos de timing e importancia. */
  words: WordToken[];
  /** Frame de inicio absoluto. */
  startFrame: Frame;
  /** Frame de fin absoluto (exclusive). */
  endFrame: Frame;
  /**
   * Tamaño de fuente como % del viewport height [2, 12].
   * El motor lo interpola con el importanceScore para chunks de énfasis.
   * Ejemplo: score 10 → fontSizePct * 1.35; score 5 → fontSizePct * 1.0.
   */
  fontSizePct: number;
  /** Color hex del texto base (palabras normales). Ej: "#FFFFFF". */
  baseColor: string;
  /** Color hex de las palabras resaltadas (keywords). Ej: "#FFFF00". */
  highlightColor: string;
  /**
   * Estilo de animación de entrada del chunk completo.
   *   pop    → spring aggressive + overshoot (punchlines, CTAs)
   *   bounce → spring standard (keywords, datos)
   *   slide  → spring smooth + translateY (información de soporte)
   */
  animationStyle: AnimationStyle;
  /**
   * Override del resorte físico.
   * Si ausente, el motor llama a resolveSpringPreset(importanceScore).
   */
  springConfig?: SpringConfig;
  /**
   * Si true, el motor aplica:
   *   - fontSizePct × 1.35 (tamaño mayor)
   *   - spring aggressive (aunque importanceScore sea menor)
   *   - Color highlightColor en lugar de baseColor
   */
  isEmphasis: boolean;
  /**
   * Importancia del chunk [1, 10].
   * Determina el preset de spring, el tamaño de fuente escalado,
   * y el volumen de los SFX automáticos.
   */
  importanceScore: number;
  /**
   * Rotación Z de entrada en grados. El motor anima desde este valor hasta 0°.
   * Rango recomendado: [-3, 3]. Para score >= 9: -2.5° por defecto.
   * Si ausente, el motor calcula: score >= 9 → -2.5°, resto → 0°.
   */
  entryRotation?: number;
}

export interface TextTrack {
  /** Preset visual que define fuente, outline y sombra de los captions. */
  preset: CaptionPreset;
  /** Todos los chunks ordenados por startFrame ASC. */
  chunks: CaptionChunk[];
  /** Palabras que el motor resalta con highlightColor (case-insensitive). */
  highlightKeywords: string[];
  /**
   * Posición vertical del bloque de captions [0, 1].
   * 0 = top del viewport, 1 = bottom.
   * Valor recomendado para 9:16: 0.72 (tercio inferior).
   */
  verticalPosition: number;
}

// ─── PISTA 3: OVERLAYS (UNIÓN DISCRIMINADA) ───────────────────────────────────

/**
 * BaseOverlay — Campos comunes a todos los overlays.
 *
 * El motor envuelve cada overlay en un <Sequence from={startFrame}> y
 * aplica <SpringAsset> con springConfig para la animación de entrada.
 * El SFX en sfxSync se dispara en frame 0 relativo (= startFrame absoluto).
 */
export interface BaseOverlay {
  /** UUID v4. Usado como React key en el array de overlays. */
  id: string;
  /** Discriminante de la unión. El motor usa este campo para el switch. */
  type: "motion_graphic" | "broll_image" | "icon_popup" | "text_overlay" | "lower_third";
  /** Frame absoluto de aparición. */
  startFrame: Frame;
  /** Cuántos frames permanece visible. */
  durationFrames: Frame;
  /**
   * Centro del elemento en coordenadas normalizadas [0, 1].
   * El motor aplica transform: translate(-50%, -50%) al posicionar.
   */
  position: NormalizedPosition;
  /** Estilo de animación de entrada. */
  animationStyle: AnimationStyle;
  /**
   * Config física del resorte de entrada.
   * Recomendado: usar resolveSpringPreset(importanceScore) si no hay override.
   */
  springConfig: SpringConfig;
  /**
   * Importancia del overlay [1, 10].
   * Afecta: volumen del SFX sync, selección automática de spring,
   * y rotación de entrada (score >= 9 → -2.5°).
   */
  importanceScore: number;
  /**
   * SFX disparado en el frame exacto de aparición.
   * El motor instancia un <Audio> dentro del <Sequence> del overlay.
   * Volumen = 0.25 + (importanceScore / 10) * 0.30.
   */
  sfxSync?: SfxType;
}

/**
 * MotionGraphicOverlay — Title cards, text pops, counters, call-outs, etc.
 * El motor renderiza el texto con Impact/Arial Black + outline + textShadow.
 */
export interface MotionGraphicOverlay extends BaseOverlay {
  type: "motion_graphic";
  /** Sub-tipo de motion graphic. Determina el layout y comportamiento. */
  graphicType: MotionGraphicType;
  /** Texto a mostrar. El motor lo convierte a MAYÚSCULAS. */
  text: string;
  /** Color hex principal. Ej: "#FFFF00". */
  color: string;
  /** Tamaño de fuente como % del vh. Rango: [4, 12]. */
  fontSizePct: number;
  /**
   * Solo para graphicType = "counter".
   * Número inicial y final para la animación de conteo.
   */
  counterRange?: { from: number; to: number; suffix?: string };
}

/**
 * BrollImageOverlay — Imagen generada por DALL-E o asset externo.
 * En displayMode "pip" aparece como ventana flotante con border-radius.
 * En displayMode "fullscreen" cubre todo el viewport con opacity.
 */
export interface BrollImageOverlay extends BaseOverlay {
  type: "broll_image";
  /** URL pública de la imagen. Remotion pre-fetcha en servidor antes de renderizar. */
  imageUrl: string;
  /** "fullscreen": 100vw/vh. "pip": 40vw, posicionado en `position`. */
  displayMode: "fullscreen" | "pip";
  /** Opacidad de la imagen [0, 1]. Recomendado: 0.85-1.0 para fullscreen. */
  opacity: number;
}

/**
 * IconPopupOverlay — Icono SVG o PNG emergente sobre el video.
 * Ideal para emojis grandes, iconos de apps, flechas, marcas.
 * El motor aplica drop-shadow para separación del fondo.
 */
export interface IconPopupOverlay extends BaseOverlay {
  type: "icon_popup";
  /** URL del SVG o PNG. Debe ser accesible en el servidor de renderizado. */
  iconUrl: string;
  /** Ancho del icono como % del viewport width. Rango: [10, 40]. */
  sizePct: number;
}

/**
 * TextOverlayItem — 1-3 palabras en MAYÚSCULAS sobre el video.
 * Complementa las captions. No forma parte del TextTrack.
 * Aparece en posición superior o inferior, nunca en el centro de captions.
 */
export interface TextOverlayItem extends BaseOverlay {
  type: "text_overlay";
  /** Máx 3 palabras. El motor las fuerza a MAYÚSCULAS. */
  text: string;
  /** Color hex del texto. Ej: "#FFFF00", "#FF3333". */
  color: string;
  /** Tamaño de fuente como % del vh. Rango: [6, 10]. */
  fontSizePct: number;
}

/**
 * LowerThirdOverlay — Barra de presentación estilo broadcast.
 * Incluye slide-in desde la izquierda con aceleración ease-out.
 * El motor renderiza: borde izquierdo de color + título + subtítulo opcional.
 */
export interface LowerThirdOverlay extends BaseOverlay {
  type: "lower_third";
  /** Texto principal. Ej: nombre de persona, lugar, concepto clave. */
  title: string;
  /** Texto secundario. Ej: cargo, URL, descripción breve. Opcional. */
  subtitle?: string;
  /** Color del borde izquierdo y acento. Ej: "#FFFF00". */
  accentColor: string;
}

/** Unión discriminada completa de todos los overlays posibles. */
export type AnyOverlay =
  | MotionGraphicOverlay
  | BrollImageOverlay
  | IconPopupOverlay
  | TextOverlayItem
  | LowerThirdOverlay;

export interface OverlayTrack {
  /** Overlays ordenados por startFrame ASC. El motor no re-ordena. */
  overlays: AnyOverlay[];
}

// ─── PISTA 4: AUDIO ───────────────────────────────────────────────────────────

/**
 * SfxEvent — Efecto de sonido en un frame absoluto específico.
 *
 * El motor instancia <Sequence from={startFrame}><Audio .../></Sequence>
 * para cada evento, garantizando sincronismo frame-perfect sin setTimeout.
 */
export interface SfxEvent {
  /** UUID v4. Usado como React key. */
  id: string;
  /** Nombre del archivo en /public/sfx/ (sin extensión). */
  sfxType: SfxType;
  /** Frame absoluto de disparo del SFX. */
  startFrame: Frame;
  /** Volumen [0, 1]. Rango habitual: 0.12 (clicks) a 0.70 (impacts). */
  volume: number;
  /**
   * Origen del SFX. Usado para analytics y debug en el motor.
   *   zoom      → generado automáticamente por ZoomEvent
   *   overlay   → generado por el sfxSync de un AnyOverlay
   *   emphasis  → generado por un CaptionChunk con isEmphasis = true
   *   keyword   → generado por un WordToken con requiresSfx = true
   *   manual    → definido explícitamente por el Director IA
   */
  trigger: "zoom" | "overlay" | "emphasis" | "keyword" | "manual";
}

/**
 * MusicTrack — Pista de música de fondo.
 * El motor aplica una curva de volumen en forma de trapecio:
 *   [0, fadeInFrames]                        → 0 → volume (lineal)
 *   [fadeInFrames, total - fadeOutFrames]    → volume constante
 *   [total - fadeOutFrames, total]           → volume → 0 (lineal)
 */
export interface MusicTrack {
  /**
   * Nombre del archivo en /public/music/ (sin extensión).
   * null = sin música. El motor omite el <Audio> en ese caso.
   */
  trackName: string | null;
  /** Volumen máximo [0, 1]. Rango habitual: 0.08-0.12 para no tapar la voz. */
  volume: number;
  /** Frames de fade-in desde silencio. Recomendado: 30 (1s). */
  fadeInFrames: number;
  /** Frames de fade-out hasta silencio. Recomendado: 45 (1.5s). */
  fadeOutFrames: number;
}

/**
 * AmbientTrack — Textura sonora de fondo a volumen imperceptible.
 * Presente en TODO momento del video para dar sensación premium.
 * El motor lo mezcla debajo de música y SFX (sin ducking).
 */
export interface AmbientTrack {
  /** Nombre del archivo en /public/ambient/ (sin extensión). */
  trackName: string;
  /** Volumen constante [0.03, 0.08]. Sin fade — siempre presente. */
  volume: number;
}

export interface AudioTrack {
  /** SFX individuales ordenados por startFrame ASC. */
  sfxEvents: SfxEvent[];
  /** Música de fondo con fade automático. */
  music: MusicTrack;
  /** Textura ambiental constante a volumen mínimo. */
  ambient: AmbientTrack;
}

// ─── DIRECTOR TIMELINE — RAÍZ DEL CONTRATO ───────────────────────────────────

/**
 * DirectorTimeline — Objeto raíz que la IA devuelve y el motor consume.
 *
 * Es el único input que <TimelineComposer timeline={...} /> necesita
 * para renderizar un video completamente editado sin estado externo.
 *
 * La IA DEBE garantizar coherencia temporal:
 *   - Todos los startFrame son <= meta.durationFrames
 *   - Los CaptionChunk no se solapan entre sí
 *   - Los SfxEvent están ordenados por startFrame
 *   - Los ZoomEvent no producen scalePeak > 1.25 (evitar pixelado)
 */
export interface DirectorTimeline {
  /**
   * Versión del schema.
   * Permite al motor detectar incompatibilidades y migrar automáticamente.
   */
  schemaVersion: "5.0";
  /** ID del job de procesamiento en el backend (para debug y lookup en DB). */
  jobId: string;

  /** Metadatos del video — usados para configurar el canvas Remotion. */
  meta: {
    /** Título descriptivo del video. No aparece en el render. */
    title: string;
    /** Tono detectado por la IA. Influye en la selección de spring presets por defecto. */
    tone: "energico" | "calmado" | "informativo" | "emotivo" | "divertido" | "profesional";
    /** Ritmo narrativo. rapido → más zoom events y SFX. lento → menos. */
    pace: "rapido" | "medio" | "lento";
    /** Resumen de 1 frase. Para mostrar en la UI, no en el render. */
    summary: string;
    /** Código ISO 639-1 del idioma de la transcripción. Ej: "es", "en". */
    language: string;
    /**
     * Duración total en frames.
     * DEBE ser coherente con VideoTrack.durationFrames.
     * El canvas Remotion usa este valor como durationInFrames.
     */
    durationFrames: Frame;
    /** FPS del video. Determina la relación frame↔segundo en todo el timeline. */
    fps: 30 | 60;
    /** Relación de aspecto. Configura width/height del canvas Remotion. */
    aspectRatio: AspectRatio;
  };

  /** Las cuatro pistas sincronizadas. */
  tracks: {
    video: VideoTrack;
    text: TextTrack;
    overlays: OverlayTrack;
    audio: AudioTrack;
  };
}
