import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { PiloteNav } from "@/components/pilote/PiloteNav";
import { LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Fly Horizons · Espace pilote",
};

export default async function PiloteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "pilote") redirect("/");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/pilote" className="flex items-center gap-2">
            <Image
              src="/fly-horizons-logo-admin.svg"
              alt="Fly Horizons"
              width={130}
              height={32}
              className="h-7 w-auto object-contain"
              style={{ width: "auto" }}
              priority
              unoptimized
            />
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground/60 border-l border-border pl-2 ml-1">
              Pilote
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {profile?.full_name ?? user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <PiloteNav />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
