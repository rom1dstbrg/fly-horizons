"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitContact } from "@/lib/actions/contacts";
import { Send, Loader2 } from "lucide-react";

const SUJETS = [
  "Question générale",
  "Vol sur mesure",
  "Commande / livraison",
  "Bug ou problème technique",
  "Autre",
];

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await submitContact(fd);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Message envoyé ! Vous allez être redirigé…", { duration: 2500 });
      setTimeout(() => router.push("/"), 2500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Nom complet <span className="text-destructive">*</span>
          </label>
          <input
            name="nom" required
            placeholder="Jean Dupont"
            className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Adresse email <span className="text-destructive">*</span>
          </label>
          <input
            name="email" type="email" required
            placeholder="jean@exemple.com"
            className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Sujet <span className="text-destructive">*</span>
        </label>
        <select
          name="sujet" required
          defaultValue=""
          className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Choisissez un sujet…</option>
          {SUJETS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea
          name="message" required rows={6}
          placeholder="Décrivez votre demande en détail…"
          className="w-full px-3.5 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit" disabled={isPending}
        className="w-full h-12 flex items-center justify-center gap-2 bg-[#113356] text-white rounded-xl font-semibold text-sm hover:bg-[#0b2238] disabled:opacity-60 transition-colors"
      >
        {isPending
          ? <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
          : <><Send size={15} /> Envoyer le message</>
        }
      </button>

    </form>
  );
}
