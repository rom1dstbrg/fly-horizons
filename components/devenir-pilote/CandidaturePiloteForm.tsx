"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { submitContact } from "@/lib/actions/contacts";
import { Send, Loader2, Check, Plane, ArrowLeft } from "lucide-react";

// Réutilise l'infrastructure /contact existante (table contacts + contact_messages,
// rate limiting, email de notif admin + accusé de réception client) plutôt que de
// créer une nouvelle table/page admin : une candidature reste, jusqu'à décision de
// Romain, un simple message qu'il traite manuellement — jamais une création de
// compte pilote automatique.
// Nouvelle DA (maquette-devenir-pilote.html, 28/09) : mêmes champs, pastilles et
// confirmation sur place que ContactForm. Heures, avion et aérodrome obligatoires (l'aérodrome
// est un critère interne, jamais affiché comme condition sur le site).

const FIELD = "w-full rounded-xl border border-border bg-secondary px-4 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground";
const LABEL = "block text-[13px] font-bold text-foreground mb-2";
const OPT = <span className="font-medium text-muted-foreground"> (facultatif)</span>;
const LICENCES = ["PPL", "CPL", "ATPL", "Autre"];

export function CandidaturePiloteForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [licence, setLicence] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!licence) {
      toast.error("Indiquez votre licence.");
      return;
    }
    const raw = new FormData(e.currentTarget);
    const get = (k: string) => ((raw.get(k) as string) ?? "").trim();

    const message = [
      `Licence : ${licence}`,
      `Aérodrome de départ : ${get("aerodrome")}`,
      `Avion(s) : ${get("aeronef")}`,
      `Heures de vol totales : ${get("heures")}`,
      `Téléphone : ${get("telephone") || "—"}`,
      "",
      get("motivation") || "(pas de message complémentaire)",
    ].join("\n");

    const fd = new FormData();
    fd.set("nom", get("nom"));
    fd.set("email", get("email"));
    fd.set("sujet", "Candidature pilote");
    fd.set("message", message);

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
        <h2 className="text-[26px] font-black text-foreground mb-2.5">Demande envoyée.</h2>
        <p className="max-w-[540px] text-[15px] leading-[1.7] text-foreground/75 mb-2">
          Merci ! Vous recevez une copie par email, avec un lien pour suivre la conversation. Nous
          vérifions votre demande, puis nous vous envoyons l&apos;accès à votre espace pilote.
        </p>
        <p className="text-[15px] leading-[1.7] text-foreground/75">Pensez à vérifier vos spams si rien n&apos;arrive.</p>
        <div className="flex flex-wrap gap-2.5 mt-[22px]">
          <Link href="/nos-offres" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border text-foreground rounded-[10px] text-sm font-bold hover:border-foreground transition-colors">
            <Plane size={15} /> Voir les vols publiés
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
          <input name="nom" required autoComplete="name" placeholder="Jean Dupont" className={`${FIELD} h-[52px]`} />
        </label>
        <label className="block mb-[18px]">
          <span className={LABEL}>Email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="jean@exemple.com" className={`${FIELD} h-[52px]`} />
        </label>
        <label className="block mb-[18px]">
          <span className={LABEL}>Téléphone{OPT}</span>
          <input name="telephone" type="tel" autoComplete="tel" placeholder="+32 4xx xx xx xx" className={`${FIELD} h-[52px]`} />
        </label>
        <label className="block mb-[18px]">
          <span className={LABEL}>Heures de vol totales</span>
          <input name="heures" required type="number" min={0} inputMode="numeric" placeholder="Ex. : 250" className={`${FIELD} h-[52px]`} />
        </label>
      </div>

      <div className="mb-[18px]">
        <p className={LABEL} id="licence-label">Licence</p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="licence-label">
          {LICENCES.map((l) => {
            const on = licence === l;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => setLicence(l)}
                className={`px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${
                  on ? "bg-[#0b2238] border-[#0b2238] text-white" : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-[18px]">
        <label className="block mb-[18px]">
          <span className={LABEL}>Aérodrome d&apos;où vous volez</span>
          <input name="aerodrome" required placeholder="Nom ou code OACI" className={`${FIELD} h-[52px]`} />
        </label>
        <label className="block mb-[18px]">
          <span className={LABEL}>Avion(s) utilisé(s)</span>
          <input name="aeronef" required placeholder="Ex. : DA40, C172" className={`${FIELD} h-[52px]`} />
        </label>
      </div>

      <label className="block mb-[18px]">
        <span className={LABEL}>Message{OPT}</span>
        <textarea
          name="motivation"
          rows={6}
          placeholder="Votre expérience, le type de vols que vous aimeriez partager, vos questions…"
          className={`${FIELD} py-3.5 leading-[1.6] resize-y min-h-[150px]`}
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-6 mt-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="self-start shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 px-[26px] py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] disabled:opacity-50 transition-colors shadow-gold cursor-pointer"
        >
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
            : <><Send size={16} /> Envoyer ma demande</>}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Vos coordonnées servent uniquement à traiter votre demande.{" "}
          <Link href="/politique-de-confidentialite" className="font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary">
            Confidentialité
          </Link>
        </p>
      </div>
    </form>
  );
}
