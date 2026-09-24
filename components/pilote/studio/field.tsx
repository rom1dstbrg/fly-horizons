import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Champs Studio : 44 px, coins 12 px, anneau de focus navy. 16 px sur
// téléphone pour que Safari iOS ne zoome pas.
const base =
  "w-full rounded-[12px] border border-st-line bg-white text-[16px] text-st-text outline-none transition-colors placeholder:text-st-muted hover:border-st-line-strong focus:border-st-ink focus:ring-4 focus:ring-st-ink-soft disabled:cursor-not-allowed disabled:bg-st-surface disabled:opacity-60 aria-invalid:border-st-bad sm:text-sm";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, "min-h-11 px-3.5 py-2.5", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-24 px-3.5 py-2.5", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(base, "min-h-11 cursor-pointer px-3 py-2.5", className)} {...props} />;
});

// Libellé + champ + aide ou erreur, toujours espacés de la même façon.
export function FormField({ id, label, hint, error, className, children }: {
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="text-[12.5px] font-[550] text-st-text-2">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-st-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-st-bad">{error}</p>}
    </div>
  );
}
