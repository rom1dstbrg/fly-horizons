"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { submitContact } from "@/lib/actions/contacts";
import { Send, Loader2, Check, Plane, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Nouvelle DA (maquette-contact.html, 28/09) : champs sans carte, sujets en pastilles,
// confirmation sur place après l'envoi (plus de toast + redirection vers l'accueil).
// Ce schéma de confirmation est le modèle pour les autres formulaires publics.

const FIELD = "w-full rounded-xl border border-border bg-secondary px-4 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground";
const LABEL = "block text-[13px] font-bold text-foreground mb-2";
const SUJETS = ["Ma demande de vol", "Paiement", "Report ou annulation", "Autre"];

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [sujet, setSujet] = useState("");
  const { profile, user } = useAuth();

  const defaultNom   = profile?.full_name ?? "";
  const defaultEmail = profile?.email ?? user?.email ?? "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await submitContact(fd);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div role="status">
        <div className="w-12 h-12 rounded-full bg-primary text-[#0b2238] grid place-items-center mb-[18px]">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <h2 className="text-[26px] font-black text-foreground mb-2.5">Message envoyé.</h2>
        <p className="max-w-[520px] text-[15px] leading-[1.7] text-foreground/75 mb-2">
          Merci ! Vous recevez une copie par email, avec un lien pour suivre la conversation.
          Nous vous répondons sous 24&nbsp;h.
        </p>
        <p className="text-[15px] leading-[1.7] text-foreground/75">Pensez à vérifier vos spams si rien n&apos;arrive.</p>
        <div className="flex flex-wrap gap-2.5 mt-[22px]">
          <Link href="/nos-offres" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
            <Plane size={15} /> Voir les vols
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
            <ArrowLeft size={15} /> Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-x-[18px]">
        <label className="block mb-[18px]">
          <span className={LABEL}>Nom</span>
          <input name="nom" required autoComplete="name" placeholder="Jean Dupont" defaultValue={defaultNom} className={`${FIELD} h-[52px]`} />
        </label>
        <label className="block mb-[18px]">
          <span className={LABEL}>Email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="jean@exemple.com" defaultValue={defaultEmail} className={`${FIELD} h-[52px]`} />
        </label>
      </div>

      <div className="mb-[18px]">
        <label htmlFor="contact-sujet" className={LABEL}>Sujet</label>
        <div className="flex flex-wrap gap-2 mb-2.5" role="group" aria-label="Sujets fréquents">
          {SUJETS.map((s) => {
            const on = s === "Autre" ? false : sujet === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (s === "Autre") { setSujet(""); document.getElementById("contact-sujet")?.focus(); }
                  else setSujet(s);
                }}
                className={`px-[13px] py-[7px] rounded-full border text-[13px] font-semibold transition-colors cursor-pointer ${
                  on ? "bg-[#0b2238] border-[#0b2238] text-white" : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <input
          id="contact-sujet"
          name="sujet"
          required
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          placeholder="Ou écrivez votre sujet"
          className={`${FIELD} h-[52px]`}
        />
      </div>

      <label className="block mb-[18px]">
        <span className={LABEL}>Message</span>
        <textarea
          name="message"
          required
          rows={7}
          placeholder="Dites-nous tout : date du vol, nom du pilote, question…"
          className={`${FIELD} py-3.5 leading-[1.6] resize-y min-h-[170px]`}
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-6 mt-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-[26px] py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] disabled:opacity-50 transition-colors shadow-gold cursor-pointer"
        >
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
            : <><Send size={16} /> Envoyer le message</>}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Vos coordonnées servent uniquement à vous répondre.{" "}
          <Link href="/politique-de-confidentialite" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary">
            Confidentialité
          </Link>
        </p>
      </div>
    </form>
  );
}
