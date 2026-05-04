"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Loader2, Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email o contraseña incorrectos.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Confirma tu email antes de iniciar sesión.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Bienvenido");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <Sparkles className="w-7 h-7 text-clipso-cyan" />
          <span className="text-2xl font-bold text-gradient">CLIPSO.AI</span>
        </Link>

        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-2">Inicia sesión</h1>
          <p className="text-white/50 mb-6">Edita vídeos con IA al instante</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-white/70 mb-1 block">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="input pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>

          <p className="text-sm text-white/50 mt-6 text-center">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="text-clipso-cyan hover:underline">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
