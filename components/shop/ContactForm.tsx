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

const inputCls = "w-full h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

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
          <label className={labelCls}>
            Nom complet <span className="text-muted-foreground font-normal">*</span>
          </label>
          <input name="nom" required placeholder="Jean Dupont" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Adresse email <span className="text-muted-foreground font-normal">*</span>
          </label>
          <input name="email" type="email" required placeholder="jean@exemple.com" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Sujet <span className="text-muted-foreground font-normal">*</span>
        </label>
        <select name="sujet" required defaultValue=""
          className="w-full h-10 px-3 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all">
          <option value="" disabled>Choisissez un sujet…</option>
          {SUJETS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          Message <span className="text-muted-foreground font-normal">*</span>
        </label>
        <textarea
          name="message" required rows={6}
          placeholder="Décrivez votre demande en détail…"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none placeholder:text-muted-foreground/50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-black rounded-lg font-semibold text-sm hover:bg-[#e6a800] disabled:opacity-40 transition-all shadow-gold cursor-pointer"
      >
        {isPending
          ? <><Loader2 size={15} className="animate-spin" /> Envoi en cours…</>
          : <><Send size={15} /> Envoyer le message</>
        }
      </button>

    </form>
  );
}
