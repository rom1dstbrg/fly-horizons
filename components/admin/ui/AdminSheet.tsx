"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function AdminSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "w-[480px]",
}: AdminSheetProps) {
  // Fermeture au clavier
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={[
              "fixed top-0 right-0 bottom-0",
              width,
              "max-w-full bg-card border-l border-border",
              "z-50 flex flex-col shadow-2xl",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-foreground truncate">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all ml-4 shrink-0"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {children}
            </div>

            {/* Footer optionnel */}
            {footer && (
              <div className="px-6 py-4 border-t border-border shrink-0 bg-secondary/20">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Bloc de section réutilisable dans un sheet ─────────────────
export function SheetSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {title && (
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Ligne info dans un sheet ───────────────────────────────────
export function SheetRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
