"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronRight, Eye, EyeOff, Loader2, Mails, BellOff } from "lucide-react";
import { updateProfile } from "@/lib/actions/auth";
import { changePassword } from "@/lib/actions/auth";
import { subscribeFromAccount, unsubscribeFromAccount } from "@/lib/actions/newsletter";

// Nouvelle DA (28/09, maquette validée) : un seul onglet « Profil » au lieu de
// trois (Aperçu / Newsletter / Sécurité) — trois sous-sections séparées par un
// filet. La déconnexion reste dans la nav (sidebar/bandeau), pas ici.

const SUBTITLE = "text-[11px] font-bold text-foreground uppercase tracking-[1.5px] mb-3.5";
const FIELD = "w-full h-[42px] rounded-[9px] border border-border bg-secondary px-3.5 text-[13.5px] text-foreground outline-none transition-colors focus:bg-white focus:border-foreground";
const BTN_PRIMARY = "inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#0b2238] text-white text-xs font-bold hover:bg-[#16334f] transition-colors disabled:opacity-50 cursor-pointer";
const BTN = "inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] border border-border bg-white text-foreground hover:border-foreground text-xs font-semibold transition-colors cursor-pointer";

export function ProfileSection({ user, newsletterActive }: {
  user: { email: string; full_name: string; phone: string | null };
  newsletterActive: boolean | null;
}) {
  const router = useRouter();

  // ── Vos informations ──
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone ?? "" });

  async function saveProfile() {
    setSaving(true);
    const fd = new FormData();
    fd.set("full_name", form.full_name);
    fd.set("phone", form.phone);
    const res = await updateProfile(fd);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else { toast.success("Profil mis à jour"); setEditing(false); router.refresh(); }
  }

  // ── Notifications ──
  const [subscribed, setSubscribed] = useState<boolean | null>(newsletterActive);
  const [subLoading, setSubLoading] = useState(false);

  async function toggleSub() {
    setSubLoading(true);
    const res = subscribed ? await unsubscribeFromAccount() : await subscribeFromAccount();
    setSubLoading(false);
    if (res.error) toast.error(res.error);
    else { setSubscribed(!subscribed); toast.success(subscribed ? "Désinscription effectuée" : "Inscription confirmée"); }
  }

  // ── Sécurité ──
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const mismatch = pw.password && pw.confirm && pw.password !== pw.confirm;

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setPwLoading(true);
    const fd = new FormData();
    fd.set("password", pw.password);
    fd.set("confirm", pw.confirm);
    const res = await changePassword(fd);
    setPwLoading(false);
    if (res?.error) toast.error(res.error);
    else { toast.success("Mot de passe modifié"); setPw({ password: "", confirm: "" }); setPwOpen(false); }
  }

  return (
    <div>
      {/* Vos informations */}
      <section className="py-6 border-b border-border first:pt-0">
        <p className={SUBTITLE}>Vos informations</p>
        {!editing ? (
          <>
            <dl className="text-[13.5px]">
              {[["Nom", user.full_name || "—"], ["Email", user.email], ["Téléphone", user.phone || "—"]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold text-foreground text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={() => setEditing(true)} className="mt-2 text-[12px] font-bold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-2 hover:decoration-primary transition-colors cursor-pointer">
              Modifier
            </button>
          </>
        ) : (
          <div className="max-w-[340px]">
            <label className="block mb-3">
              <span className="block text-[11.5px] font-bold text-foreground mb-1.5">Nom</span>
              <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={FIELD} />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-bold text-foreground mb-1.5">Téléphone</span>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={FIELD} />
            </label>
            <p className="mt-2 text-[11.5px] text-muted-foreground">{user.email}</p>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={saveProfile} disabled={saving} className={BTN_PRIMARY}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer
              </button>
              <button type="button" onClick={() => { setEditing(false); setForm({ full_name: user.full_name, phone: user.phone ?? "" }); }} className={BTN}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="py-6 border-b border-border">
        <p className={SUBTITLE}>Notifications</p>
        <div className="flex items-center justify-between gap-4 max-w-[460px]">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Vols organisés</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Un email dès qu&apos;un vol est publié.</p>
          </div>
          <button
            type="button"
            onClick={toggleSub}
            disabled={subLoading}
            className={subscribed
              ? `${BTN_PRIMARY} shrink-0`
              : `${BTN} shrink-0`}
          >
            {subLoading ? <Loader2 size={13} className="animate-spin" /> : subscribed ? <BellOff size={13} /> : <Mails size={13} />}
            {subscribed ? "Abonnée" : "S'abonner"}
          </button>
        </div>
      </section>

      {/* Sécurité */}
      <section className="py-6">
        <p className={SUBTITLE}>Sécurité</p>
        <button
          type="button"
          onClick={() => setPwOpen((o) => !o)}
          className="flex items-center justify-between w-full max-w-[460px] text-[13.5px] font-semibold text-foreground cursor-pointer"
        >
          Modifier le mot de passe
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${pwOpen ? "rotate-90" : ""}`} />
        </button>

        {pwOpen && (
          <form onSubmit={savePassword} className="mt-4 max-w-[340px] space-y-3.5">
            {(["password", "confirm"] as const).map((field) => {
              const show = field === "password" ? showPw : showCf;
              const toggle = field === "password" ? () => setShowPw((s) => !s) : () => setShowCf((s) => !s);
              return (
                <label key={field} className="block">
                  <span className="block text-[11.5px] font-bold text-foreground mb-1.5">
                    {field === "password" ? "Nouveau mot de passe" : "Confirmer le mot de passe"}
                  </span>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={pw[field]}
                      onChange={(e) => setPw((f) => ({ ...f, [field]: e.target.value }))}
                      className={`${FIELD} pr-10`}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-label={show ? "Masquer" : "Afficher"}>
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </label>
              );
            })}
            {mismatch && <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>}
            <button type="submit" disabled={pwLoading || !pw.password || !pw.confirm || !!mismatch} className={BTN_PRIMARY}>
              {pwLoading && <Loader2 size={13} className="animate-spin" />} Enregistrer
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
