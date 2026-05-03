"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { apiClient } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { Upload, Film, Loader2, X } from "lucide-react";
import axios from "axios";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const [preferences, setPreferences] = useState("");
  const [resolution, setResolution] = useState("1080p");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"] },
    maxSize: 500 * 1024 * 1024
  });

  async function handleSubmit() {
    if (files.length === 0) return toast.error("Sube al menos 1 vídeo");
    if (!projectName.trim()) return toast.error("Ponle nombre al proyecto");

    setUploading(true);

    try {
      const project = await apiClient.createProject(projectName);
      const uploadedKeys: string[] = [];

      for (const file of files) {
        const presigned = await apiClient.getPresignedUpload(file.name, file.type, file.size);
        await axios.put(presigned.upload_url, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress((prev) => ({ ...prev, [file.name]: Math.round((e.loaded / e.total!) * 100) }));
            }
          }
        });
        uploadedKeys.push(presigned.key);
      }

      const job = await apiClient.createJob({
        project_id: project.id,
        input_keys: uploadedKeys,
        preferences,
        target_resolution: resolution,
        target_fps: 30
      });

      toast.success("Procesamiento iniciado");
      router.push(`/jobs/${job.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al procesar");
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Nuevo vídeo</h1>
        <p className="text-white/50">Sube vídeos y deja que la IA los edite por ti</p>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="text-sm text-white/70 mb-1 block">Nombre del proyecto</label>
          <input
            type="text"
            className="input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ej: Reel Instagram Mayo"
          />
        </div>

        <div>
          <label className="text-sm text-white/70 mb-1 block">Resolución de salida</label>
          <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="720p">720p — Rápido</option>
            <option value="1080p">1080p — Recomendado</option>
            <option value="4K">4K — Máxima calidad</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-white/70 mb-1 block">
            Instrucciones para la IA <span className="text-white/30">(opcional)</span>
          </label>
          <textarea
            className="input min-h-[80px]"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Ej: Quiero ritmo rápido, subtítulos amarillos, mood enérgico..."
          />
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "glass-card p-12 text-center cursor-pointer transition",
          isDragActive && "border-clipso-cyan bg-clipso-cyan/5"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-clipso-cyan mx-auto mb-4" />
        <p className="text-lg font-medium mb-1">Arrastra tus vídeos aquí</p>
        <p className="text-sm text-white/50">o haz click para seleccionar (MP4, MOV, AVI · máx. 500MB)</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <Film className="w-5 h-5 text-clipso-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.name}</div>
                <div className="text-xs text-white/40">{formatBytes(f.size)}</div>
                {progress[f.name] !== undefined && (
                  <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-clipso-cyan transition-all" style={{ width: `${progress[f.name]}%` }} />
                  </div>
                )}
              </div>
              {!uploading && (
                <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-white/40 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={uploading || files.length === 0}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
        {uploading ? "Subiendo y procesando..." : "Iniciar edición con IA"}
      </button>
    </div>
  );
}
