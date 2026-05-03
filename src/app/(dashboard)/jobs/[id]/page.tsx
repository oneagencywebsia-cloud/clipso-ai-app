"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient, type Job } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { CheckCircle, XCircle, Loader2, Download, ArrowLeft, Send } from "lucide-react";

const STAGES = [
  { pct: 5, label: "Descargando vídeo" },
  { pct: 15, label: "Concatenando clips" },
  { pct: 30, label: "Transcribiendo audio (Whisper)" },
  { pct: 55, label: "Analizando frames (GPT-4 Vision)" },
  { pct: 80, label: "Plan de edición (GPT-4)" },
  { pct: 92, label: "Quemando subtítulos" },
  { pct: 96, label: "Renderizando final" },
  { pct: 100, label: "Listo" }
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    async function fetchJob() {
      try {
        const j = await apiClient.getJob(id);
        if (!active) return;
        setJob(j);
        setLoading(false);
        if (j.status === "completed" && !downloadUrl) {
          const { download_url } = await apiClient.getJobDownload(id);
          if (active) setDownloadUrl(download_url);
        }
        if (j.status === "queued" || j.status === "processing") {
          timer = setTimeout(fetchJob, 3000);
        }
      } catch {
        setLoading(false);
      }
    }

    fetchJob();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id, downloadUrl]);

  async function handleFeedback() {
    if (!feedback.trim()) return;
    setSendingFeedback(true);
    try {
      const newJob = await apiClient.sendFeedback(id, feedback);
      toast.success("Re-edición iniciada");
      window.location.href = `/jobs/${newJob.id}`;
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error");
      setSendingFeedback(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-clipso-cyan" /></div>;
  if (!job) return <div className="text-center py-20 text-white/50">Job no encontrado</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Job #{job.id.slice(0, 8)}</h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-white/50">Creado {formatDate(job.created_at)}</p>
      </div>

      {(job.status === "queued" || job.status === "processing") && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Procesando...</h3>
            <span className="text-2xl font-bold text-gradient">{job.progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-clipso-cyan to-clipso-violet transition-all duration-500" style={{ width: `${job.progress}%` }} />
          </div>
          <ul className="space-y-2">
            {STAGES.map((s) => {
              const done = job.progress >= s.pct;
              const active = job.progress < s.pct && job.progress >= (STAGES[STAGES.indexOf(s) - 1]?.pct ?? 0);
              return (
                <li key={s.pct} className="flex items-center gap-3 text-sm">
                  {done ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                   active ? <Loader2 className="w-4 h-4 text-clipso-cyan animate-spin" /> :
                   <div className="w-4 h-4 rounded-full border-2 border-white/20" />}
                  <span className={done ? "text-white" : active ? "text-clipso-cyan" : "text-white/40"}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {job.status === "completed" && downloadUrl && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold">Vídeo listo</h3>
          </div>
          <video controls className="w-full rounded-xl bg-black" src={downloadUrl} />
          <a href={downloadUrl} download className="btn-primary inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Descargar vídeo
          </a>
        </div>
      )}

      {job.status === "failed" && (
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-red-400" />
            <h3 className="font-semibold">Error en el procesamiento</h3>
          </div>
          <p className="text-sm text-white/60">{job.error_message || "Error desconocido"}</p>
        </div>
      )}

      {job.status === "completed" && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-3">¿Quieres ajustar la edición?</h3>
          <p className="text-sm text-white/50 mb-4">Dile a la IA qué cambiar y generaremos una nueva versión.</p>
          <div className="space-y-3">
            <textarea
              className="input min-h-[80px]"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ej: Hazlo más rápido, cambia los subtítulos a azul, quita los primeros 5 segundos..."
            />
            <button
              onClick={handleFeedback}
              disabled={sendingFeedback || !feedback.trim()}
              className="btn-primary inline-flex items-center gap-2"
            >
              {sendingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Re-editar con IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-yellow-500/10 text-yellow-400",
    processing: "bg-clipso-cyan/10 text-clipso-cyan",
    completed: "bg-green-500/10 text-green-400",
    failed: "bg-red-500/10 text-red-400"
  };
  return <span className={`text-xs px-2 py-1 rounded-full capitalize ${map[status]}`}>{status}</span>;
}
