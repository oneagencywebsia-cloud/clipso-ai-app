"use client";

import { ClipsoPlayer } from "@/remotion/components/ClipsoPlayer";

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-start justify-center py-10 px-4">
      {/* Glow ambiental */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(250,204,21,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 self-start">
          <span className="text-yellow-400 font-black text-2xl tracking-tight">
            CLIPSO
            <span className="text-slate-400 font-light">.AI</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 border border-slate-700 rounded px-2 py-0.5">
            Editor Studio
          </span>
        </div>

        {/* Player */}
        <div className="w-full flex justify-center">
          <ClipsoPlayer debug={false} />
        </div>

        {/* Footer hint */}
        <p className="text-[11px] font-mono text-slate-700 text-center">
          Preview del motor Remotion · Schema v5.0 · Mock 5s / 30fps
        </p>
      </div>
    </main>
  );
}
