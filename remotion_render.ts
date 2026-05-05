/**
 * remotion_render.ts — Renderizador SSR para el worker Python.
 *
 * Uso:
 *   npx tsx remotion_render.ts <timeline_json_path> <output_mp4_path> [job_id]
 *
 * Stdout:
 *   PROGRESS:<0-100>          ← leído por render_service.py para update_job_status
 *   DONE:<output_mp4_path>    ← señal de éxito
 *   ERROR:<message>           ← señal de fallo (proceso sale con código 1)
 */

import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { DirectorTimeline } from "./src/remotion/types/timeline";

// ── Dimensiones por aspect ratio ──────────────────────────────────────────────
const DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
};

// ── CLI args ──────────────────────────────────────────────────────────────────
const [, , jsonPath, outputPath] = process.argv;

if (!jsonPath || !outputPath) {
  process.stderr.write("ERROR:Usage: npx tsx remotion_render.ts <json_path> <output_path>\n");
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Leer y validar el JSON
  let timeline: DirectorTimeline;
  try {
    const raw = fs.readFileSync(path.resolve(jsonPath), "utf-8");
    timeline = JSON.parse(raw) as DirectorTimeline;
  } catch (err) {
    process.stdout.write(`ERROR:Cannot read timeline JSON — ${(err as Error).message}\n`);
    process.exit(1);
  }

  const { fps, durationFrames, aspectRatio } = timeline.meta;
  const { width, height } = DIMENSIONS[aspectRatio] ?? DIMENSIONS["9:16"];

  process.stdout.write("PROGRESS:5\n");

  // 2. Empaquetar la composición (webpack bundle)
  //    El entry point es el mismo que usa el Player en el browser.
  const entryPoint = path.resolve(__dirname, "src/remotion/remotion.entry.tsx");
  let bundleLocation: string;
  try {
    bundleLocation = await bundle({
      entryPoint,
      onProgress: (pct) => {
        // Bundle: 5% → 30% del total
        const mapped = 5 + Math.round(pct * 0.25);
        process.stdout.write(`PROGRESS:${mapped}\n`);
      },
    });
  } catch (err) {
    process.stdout.write(`ERROR:Bundle failed — ${(err as Error).message}\n`);
    process.exit(1);
  }

  process.stdout.write("PROGRESS:30\n");

  // 3. Seleccionar la composición registrada como "ClipsoComposition"
  let composition: Awaited<ReturnType<typeof selectComposition>>;
  try {
    composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ClipsoComposition",
      inputProps: { timeline },
    });
  } catch (err) {
    process.stdout.write(`ERROR:selectComposition failed — ${(err as Error).message}\n`);
    process.exit(1);
  }

  process.stdout.write("PROGRESS:35\n");

  // 4. Renderizar a MP4
  try {
    await renderMedia({
      composition: {
        ...composition,
        width,
        height,
        fps,
        durationInFrames: durationFrames,
      },
      serveUrl:        bundleLocation,
      codec:           "h264",
      outputLocation:  path.resolve(outputPath),
      inputProps:      { timeline },
      imageFormat:     "jpeg",
      jpegQuality:     90,
      concurrency:     2,      // 2 threads — balance calidad/velocidad en VPS
      onProgress: ({ progress }) => {
        // Render: 35% → 98% del total
        const mapped = 35 + Math.round(progress * 63);
        process.stdout.write(`PROGRESS:${mapped}\n`);
      },
      onSlowestFrames: (frames) => {
        // Telemetría de frames lentos — útil para optimización futura
        if (frames.length > 0) {
          process.stderr.write(`Slowest frames: ${frames.map((f) => f.frame).join(", ")}\n`);
        }
      },
    });
  } catch (err) {
    process.stdout.write(`ERROR:renderMedia failed — ${(err as Error).message}\n`);
    process.exit(1);
  }

  process.stdout.write("PROGRESS:100\n");
  process.stdout.write(`DONE:${path.resolve(outputPath)}\n`);
  process.exit(0);
}

main();
