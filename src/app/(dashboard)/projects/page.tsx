"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient, type Project } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FolderOpen, Plus, Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Proyectos</h1>
          <p className="text-white/50">Gestiona todos tus proyectos de vídeo</p>
        </div>
        <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-clipso-cyan" />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Aún no tienes proyectos</p>
          <Link href="/upload" className="btn-primary inline-flex">Crear primer proyecto</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="glass-card p-5 hover:bg-white/[0.05] transition">
              <div className="flex items-start justify-between mb-3">
                <FolderOpen className="w-6 h-6 text-clipso-cyan" />
                <span className="text-xs px-2 py-1 rounded-full bg-white/5 capitalize">{p.status}</span>
              </div>
              <h3 className="font-semibold mb-1">{p.name}</h3>
              <p className="text-xs text-white/40">{formatDate(p.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
