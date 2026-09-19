"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { submitContact } from "@/lib/actions/contacts";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

const inputCls = "w-full h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const LICENCES = ["PPL", "CPL", "ATPL", "Autre"];

// Réutilise l'infrastructure /contact existante (table contacts + contact_messages,
// rate limiting, email de notif admin + accusé de réception client) plutôt que de
// créer une nouvelle table/page admin : une candidature reste, jusqu'à décision de
// Romain, un simple message qu'il traite manuellement — jamais une création de
// compte pilote automatique.
export function CandidaturePiloteForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);

    const nom = (raw.get("nom") as string)?.trim();
    const email = (raw.get("email") as string)?.trim();
    const telephone = (raw.get("telephone") as string)?.trim();
    const licence = (raw.get("licence") as string)?.trim();
    const heures = (raw.get("heures") as string)?.trim();
    const aeronef = (raw.get("aeronef") as string)?.trim();
    const motivation = (raw.get("motivation") as string)?.trim();

    const message = [
      `Licence : ${licence || "—"}`,
      `Heures de vol totales : ${heures || "—"}`,
      `Téléphone : ${telephone || "—"}`,
      `Aéronef(s) / aérodrome habituel : ${aeronef || "—"}`,
      "",
      motivation || "(pas de message complémentaire)",
    ].join("\n");

    const fd = new FormData();
    fd.set("nom", nom);
    fd.set("email", email);
    fd.set("sujet", "Candidature pilote");
    fd.set("message", message);

    startTransition(async () => {
      const r = await submitContact(fd);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>
            Nom complet <span className="text-foreground/40 font-normal">*</span>
          </label>
          <input name="nom" required placeholder="Jean Dupont" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Adresse email <span className="text-foreground/40 font-normal">*</span>
          </label>
          <input name="email" type="email" required placeholder="jean@exemple.com" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Téléphone</label>
          <input name="telephone" type="tel" placeholder="+32 4xx xx xx xx" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Licence <span className="text-foreground/40 font-normal">*</span>
          </label>
          <select name="licence" required defaultValue="" className={inputCls}>
            <option value="" disabled>Choisissez…</option>
            {LICENCES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Heures de vol totales</label>
          <input name="heures" type="number" min={0} placeholder="Ex. : 250" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Aéronef(s) / aérodrome habituel</label>
          <input name="aeronef" placeholder="Ex. : DA40, EBCI" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Message</label>
        <textarea
          name="motivation"
          rows={5}
          placeholder="Parlez-nous de votre expérience, de vos disponibilités, de ce qui vous intéresse dans la démarche…"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none placeholder:text-muted-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] disabled:opacity-40 transition-all shadow-gold cursor-pointer"
      >
        {isPending
          ? <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
          : <><Send size={15} /> Envoyer ma candidature</>
        }
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Cette candidature est une prise de contact, pas une inscription automatique : nous
        revenons vers vous pour vérifier ensemble votre éligibilité (licence, certificat
        médical, appareil) avant toute activation d&apos;un compte pilote.
      </p>

    </form>

    {submitted && (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl w-full max-w-sm p-8 shadow-xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">Candidature bien reçue</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Merci ! Nous revenons vers vous rapidement pour en discuter, avant toute activation
            d&apos;un compte pilote.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full h-11 px-6 bg-primary text-primary-foreground rounded-lg font-black text-sm hover:bg-[#e6a800] transition-all shadow-gold"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    )}
    </>
  );
}
