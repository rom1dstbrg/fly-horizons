import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// En-tête de page : titre et actions sur la même ligne, actions toujours en
// haut à droite. Pas de phrase d'explication statique : `description` seulement
// si elle est dynamique (une date, un compte…). Au téléphone, les actions
// passent en texte court puis en icône seule (ButtonLabel + .st-header-actions).
export function PageHeader({ title, description, actions, back, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Lien retour au-dessus du titre (formulaires, sous-pages). */
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={className}>
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-st-muted transition-colors hover:text-st-text">
          <ChevronLeft size={15} />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <h1 className="min-w-0 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-st-text sm:text-[28px]">{title}</h1>
        {actions && <div className="st-header-actions flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="mt-1 text-sm text-st-muted">{description}</p>}
    </div>
  );
}

// Titre de section avec son action à droite — une action de section ne flotte
// jamais seule au-dessus d'une liste.
export function SectionHeader({ title, action, className }: { title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", action && "min-h-9", className)}>
      <h2 className="min-w-0 text-sm font-semibold text-st-text">{title}</h2>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
