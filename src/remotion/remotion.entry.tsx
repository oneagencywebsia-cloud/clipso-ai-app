/**
 * remotion.entry.tsx — Entry point para @remotion/bundler.
 *
 * Registra la composición raíz con registerRoot + Composition.
 * Este archivo es usado SOLO por remotion_render.ts (SSR).
 * El browser usa <Player component={...}> directamente, sin registerRoot.
 */
import { Composition, registerRoot } from "remotion";
import { TimelineComposer } from "./components/TimelineComposer";
import type { DirectorTimeline } from "./types/timeline";
import { mockTimeline } from "./mocks/mockTimeline";

const DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
};

function Root() {
  const { fps, durationFrames, aspectRatio } = mockTimeline.meta;
  const { width, height } = DIMENSIONS[aspectRatio] ?? DIMENSIONS["9:16"];

  return (
    <Composition
      id="ClipsoComposition"
      component={TimelineComposer as React.ComponentType<{ timeline: DirectorTimeline }>}
      defaultProps={{ timeline: mockTimeline }}
      durationInFrames={durationFrames}
      fps={fps}
      width={width}
      height={height}
    />
  );
}

registerRoot(Root);
