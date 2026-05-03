import axios from "axios";
import { createClient } from "./supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

api.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export interface PresignedUploadResponse {
  upload_url: string;
  key: string;
  expires_in: number;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  output_key?: string;
  error_message?: string;
  preferences?: string;
  created_at: string;
  updated_at: string;
}

export const apiClient = {
  async getPresignedUpload(filename: string, content_type: string, size_bytes: number): Promise<PresignedUploadResponse> {
    const { data } = await api.post("/v1/upload/presigned", { filename, content_type, size_bytes });
    return data;
  },
  async createProject(name: string): Promise<Project> {
    const { data } = await api.post("/v1/projects", { name });
    return data;
  },
  async listProjects(): Promise<Project[]> {
    const { data } = await api.get("/v1/projects");
    return data;
  },
  async getProject(id: string): Promise<Project> {
    const { data } = await api.get(`/v1/projects/${id}`);
    return data;
  },
  async createJob(payload: { project_id: string; input_keys: string[]; preferences?: string; target_resolution?: string; target_fps?: number }): Promise<Job> {
    const { data } = await api.post("/v1/jobs", payload);
    return data;
  },
  async getJob(id: string): Promise<Job> {
    const { data } = await api.get(`/v1/jobs/${id}`);
    return data;
  },
  async listJobs(): Promise<Job[]> {
    const { data } = await api.get("/v1/jobs");
    return data;
  },
  async getJobDownload(id: string): Promise<{ download_url: string }> {
    const { data } = await api.get(`/v1/jobs/${id}/download`);
    return data;
  },
  async sendFeedback(id: string, instructions: string): Promise<Job> {
    const { data } = await api.post(`/v1/jobs/${id}/feedback`, { instructions });
    return data;
  }
};
