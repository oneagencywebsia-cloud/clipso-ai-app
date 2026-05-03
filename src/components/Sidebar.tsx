"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, LayoutDashboard, FolderOpen, Upload, LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Proyectos", icon: FolderOpen },
  { href: "/upload", label: "Nuevo vídeo", icon: Upload }
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen border-r border-white/5 bg-clipso-darker p-6 flex flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 mb-8">
        <Sparkles className="w-6 h-6 text-clipso-cyan" />
        <span className="text-lg font-bold text-gradient">CLIPSO.AI</span>
      </Link>

      <nav className="space-y-1 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition",
                active ? "bg-clipso-cyan/10 text-clipso-cyan" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 pt-4 space-y-2">
        {userEmail && (
          <div className="text-xs text-white/40 px-3 truncate">{userEmail}</div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 w-full"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </aside>
  );
}
