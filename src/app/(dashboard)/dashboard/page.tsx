"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient, type Job, type Project } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Upload, FolderOpen, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.listProjects(), apiClient.listJobs()])
      .then(([p, j]) => { setProjects(p); setJobs(j); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completedCount = jobs.filter(j => j.status === "completed").length;
  const processingCount = jobs.filter(j => j.status === "processing" || j.status === "queued").length;
  const failedCount = jobs.filter(j => j.status === "failed").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/50">Bienvenido a tu estudio de edición con IA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen} label="Proyectos" value={projects.length} color="text-clipso-cyan" />
        <StatCard icon={Clock} label="En proceso" value={processingCount} color="text-yellow-400" />
        <StatCard icon={CheckCircle} label="Completados" value={completedCount} color="text-green-400" />
        <StatCard icon={XCircle} label="Fallidos" value={failedCount} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/upload" className="glass-card p-6 hover:bg-white/[0.05] transition group">
          <Upload className="w-8 h-8 text-clipso-cyan mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold mb-1">Subir nuevo vídeo</h3>
          <p className="text-sm text-white/50">Edita vídeos con IA en segundos</p>
        </Link>

        <Link href="/projects" className="glass-card p-6 hover:bg-white/[0.05] transition group">
          <FolderOpen className="w-8 h-8 text-clipso-violet mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold mb-1">Mis proyectos</h3>
          <p className="text-sm text-white/50">Ver todos tus proyectos</p>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Trabajos recientes</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-clipso-cyan" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-white/50 mb-4">Aún no tienes trabajos</p>
            <Link href="/upload" className="btn-primary inline-flex">Subir primer vídeo</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 5).map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="glass-card p-4 flex items-center justify-between hover:bg-white/[0.05] transition">
                <div className="flex items-center gap-3">
                  <StatusIcon status={job.status} />
                  <div>
                    <div className="font-medium">Job #{job.id.slice(0, 8)}</div>
                    <div className="text-xs text-white/40">{formatDate(job.created_at)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/70 capitalize">{job.status}</div>
                  {job.status === "processing" && <div className="text-xs text-clipso-cyan">{job.progress}%</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-5">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-5 h-5 text-green-400" />;
  if (status === "failed") return <XCircle className="w-5 h-5 text-red-400" />;
  if (status === "processing") return <Loader2 className="w-5 h-5 text-clipso-cyan animate-spin" />;
  return <Clock className="w-5 h-5 text-yellow-400" />;
}
