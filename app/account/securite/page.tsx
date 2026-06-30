"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogOut } from "lucide-react";
import { changePassword, logout } from "@/lib/actions/auth";

export default function SecuritePage() {
  const [pw, setPw]             = useState({ password: "", confirm: "" });
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.password !== pw.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("password", pw.password);
    fd.set("confirm", pw.confirm);
    const res = await changePassword(fd);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Mot de passe modifié avec succès");
      setPw({ password: "", confirm: "" });
    }
  }

  const mismatch = pw.password && pw.confirm && pw.password !== pw.confirm;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sécurité</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez votre mot de passe et votre session</p>
      </div>

      <div className="card-premium p-6 space-y-8">

        {/* Password */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1">Modifier le mot de passe</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Choisissez un mot de passe fort d'au moins 8 caractères.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw.password}
                  onChange={(e) => setPw((f) => ({ ...f, password: e.target.value }))}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-foreground focus:bg-card transition-colors placeholder:text-muted-foreground/40"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPw ? "Masquer" : "Afficher"}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showCf ? "text" : "password"}
                  value={pw.confirm}
                  onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-foreground focus:bg-card transition-colors placeholder:text-muted-foreground/40"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowCf((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showCf ? "Masquer" : "Afficher"}
                >
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mismatch && (
              <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
            )}

            <button
              type="submit"
              disabled={loading || !pw.password || !pw.confirm || !!mismatch}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-black hover:bg-[#e6a800] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Enregistrer le mot de passe
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-semibold text-foreground mb-1">Session</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Déconnectez-vous de votre compte Fly Horizons.
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
            >
              <LogOut size={14} />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
