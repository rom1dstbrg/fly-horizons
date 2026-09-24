import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Le seul bouton de l'espace pilote (« Studio ») : 38 px de haut, coins 11 px,
// jamais en pilule. Principal = navy plein, secondaire = contour blanc,
// danger = contour rouge (jamais un bloc rouge plein). La règle [&_svg] fixe la
// taille des icônes pour que deux boutons ne dérivent jamais l'un de l'autre.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm" | "lg" | "icon";

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[11px] font-[550] [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-st-ink/25 focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-st-ink text-white shadow-st-ink hover:bg-st-ink-hover",
  secondary: "border border-st-line bg-white text-st-text shadow-st-sm hover:border-st-line-strong hover:bg-st-surface",
  ghost: "text-st-text-2 hover:bg-st-surface hover:text-st-text",
  danger: "border border-st-line bg-white text-st-bad shadow-st-sm hover:border-st-bad/40 hover:bg-st-bad-soft",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-[38px] px-4 text-[13px]",
  // Barres d'outils des tableaux, actions dans une carte.
  sm: "h-[34px] px-3 text-[12.5px]",
  // Validation principale au téléphone (feuille, bas de formulaire).
  lg: "h-[46px] px-5 text-sm",
  icon: "h-[38px] w-[38px] text-[13px]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({ variant, size, fullWidth, loading = false, disabled, children, className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean };

export function LinkButton({ variant, size, fullWidth, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props} />;
}

// Texte d'un bouton d'en-tête qui s'adapte à la place : complet dès 640 px
// (« Nouveau vol »), court entre 380 et 639 px (« Ajouter »), rien en dessous
// (l'icône seule le porte ; le texte complet reste le nom accessible).
export function ButtonLabel({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="sr-only sm:not-sr-only">{full}</span>
      <span aria-hidden="true" className="hidden min-[380px]:inline sm:hidden">{short}</span>
    </>
  );
}
