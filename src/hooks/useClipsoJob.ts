"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DirectorTimeline } from "@/remotion/types/timeline";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type JobStatus =
  | "queued"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "planning"
  | "rendering"
  | "uploading"
  | "completed"
  | "failed";

export interface ClipsoJobState {
  status:       JobStatus | null;
  progress:     number;           // 0-100
  timelineData: DirectorTimeline | null;
  outputUrl:    string | null;
  errorMessage: string | null;
  isLoading:    boolean;
  isCompleted:  boolean;
  isFailed:     boolean;
}

// Fila de la tabla clipso_jobs tal como llega de Supabase
interface JobRow {
  id:            string;
  status:        JobStatus;
  progress:      number;
  timeline_json: DirectorTimeline | null;
  output_url:    string | null;
  error_message: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useClipsoJob — suscripción en tiempo real al estado de un job de procesamiento.
 *
 * Usa Supabase Realtime (postgres_changes) para recibir cada UPDATE de la fila
 * en < 100ms sin polling. Cuando el backend llama a db.update_job_status(),
 * el hook actualiza el estado automáticamente.
 *
 * @param jobId  UUID del job. Pasa null/undefined para desactivar la suscripción.
 *
 * @example
 * const { status, progress, timelineData } = useClipsoJob(jobId);
 * // Cuando status === "completed", timelineData está listo para <TimelineComposer>
 */
export function useClipsoJob(jobId: string | null | undefined): ClipsoJobState {
  const [state, setState] = useState<ClipsoJobState>({
    status:       null,
    progress:     0,
    timelineData: null,
    outputUrl:    null,
    errorMessage: null,
    isLoading:    true,
    isCompleted:  false,
    isFailed:     false,
  });

  // Ref para evitar actualizaciones en componentes desmontados
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!jobId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const supabase = createClient();

    // ── 1. Carga inicial del estado actual ──────────────────────────────────
    const bootstrap = async () => {
      const { data, error } = await supabase
        .from("clipso_jobs")
        .select("id, status, progress, timeline_json, output_url, error_message")
        .eq("id", jobId)
        .single<JobRow>();

      if (!mounted.current) return;

      if (error || !data) {
        setState((prev) => ({
          ...prev,
          isLoading:    false,
          isFailed:     true,
          errorMessage: error?.message ?? "Job no encontrado",
        }));
        return;
      }

      applyRow(data);
    };

    // ── 2. Suscripción Realtime a cambios de la fila ────────────────────────
    const channel = supabase
      .channel(`clipso_job_${jobId}`)
      .on<JobRow>(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "clipso_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (!mounted.current) return;
          applyRow(payload.new);
        }
      )
      .subscribe();

    bootstrap();

    // ── 3. Cleanup — cancela suscripción al desmontar ───────────────────────
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // ── Helper — aplica una fila al estado ────────────────────────────────────
  function applyRow(row: JobRow) {
    if (!mounted.current) return;
    setState({
      status:       row.status,
      progress:     row.progress ?? 0,
      timelineData: row.timeline_json ?? null,
      outputUrl:    row.output_url ?? null,
      errorMessage: row.error_message ?? null,
      isLoading:    row.status !== "completed" && row.status !== "failed",
      isCompleted:  row.status === "completed",
      isFailed:     row.status === "failed",
    });
  }

  return state;
}
