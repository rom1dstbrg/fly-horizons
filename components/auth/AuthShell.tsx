import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

// Nouvelle DA (28/09) des pages de compte hors layout public (connexion, création
// de compte) : fond blanc, logo + « Retour au site » en haut, colonne de 420 px.
// Champs et bouton identiques à ContactForm.

export const AUTH_FIELD = "w-full h-[52px] rounded-xl border border-border bg-secondary px-4 text-[15px] text-foreground placeholder:text-[#8a94a6] outline-none transition-colors focus:bg-white focus:border-foreground";
export const AUTH_LABEL = "block text-[13px] font-bold text-foreground mb-2";
export const AUTH_LINK = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";
export const AUTH_SUBMIT = "w-full inline-flex items-center justify-center gap-2 px-[26px] py-[15px] bg-primary text-[#0b2238] rounded-[10px] text-[15px] font-black hover:bg-[#e6a800] disabled:opacity-50 transition-colors shadow-gold cursor-pointer";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 xl:px-10 pt-5 sm:pt-7 flex items-center justify-between">
        <Link href="/" aria-label="Fly Horizons, accueil">
          <Image src="/fly-horizons-logo-navy.svg" alt="Fly Horizons" width={160} height={32} priority className="h-8 w-auto" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Retour au site
        </Link>
      </div>

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 pt-12 pb-16 sm:py-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </main>
  );
}

export function AuthHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">Mon compte</p>
      <h1 className="text-[34px] lg:text-[40px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">{title}</h1>
      <p className="mt-3 mb-7 text-[15px] leading-[1.7] text-foreground/75">{lead}</p>
    </>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-[18px] rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function PasswordInput({
  id, name, autoComplete, shown, onToggle, labelShow, labelHide,
}: {
  id: string; name: string; autoComplete: string; shown: boolean; onToggle: () => void; labelShow: string; labelHide: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={shown ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder="••••••••"
        className={`${AUTH_FIELD} pr-12`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label={shown ? labelHide : labelShow}
      >
        {shown ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
