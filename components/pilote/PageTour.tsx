"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/pilote/studio";

// Visite guidée d'une page (maquette-visite-guidee.html, validée le 27/09) :
// 3 ou 4 bulles, la zone montrée reste claire, le reste de la page s'assombrit.
// La première fois qu'un pilote ouvre la page, puis via le bouton « ? ».
// `target` est un sélecteur CSS ; s'il désigne plusieurs éléments (une colonne,
// une ligne de la grille), la zone les englobe tous.

export type TourStep = { target: string; title: string; text: string };

type Rect = { left: number; top: number; width: number; height: number };

function unionRect(sel: string): Rect | null {
  const rs = [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.width || r.height);
  if (!rs.length) return null;
  const left = Math.min(...rs.map((r) => r.left));
  const top = Math.min(...rs.map((r) => r.top));
  return { left, top, width: Math.max(...rs.map((r) => r.right)) - left, height: Math.max(...rs.map((r) => r.bottom)) - top };
}

export function PageTour({ steps, open, onClose }: {
  steps: TourStep[];
  open: boolean;
  /** Fin de la visite (Terminer, Passer, Échap). */
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const spotRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const r = unionRect(steps[step].target);
    const spot = spotRef.current, b = bubbleRef.current, tail = tailRef.current;
    if (!r || !spot || !b || !tail) return;
    const pad = 6;
    const x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
    spot.style.transform = `translate(${x}px, ${y}px)`;
    spot.style.width = `${w}px`;
    spot.style.height = `${h}px`;

    const bw = b.offsetWidth, bh = b.offsetHeight, gap = 16, vw = window.innerWidth, vh = window.innerHeight;
    let side: "below" | "above" | "side" | "over" = y + h + gap + bh < vh - 10 ? "below" : y - gap - bh > 10 ? "above" : "side";
    let bx: number, by: number;
    if (side === "side" && x + w + gap + bw < vw - 10) {
      bx = x + w + gap; by = Math.min(Math.max(10, y + h / 2 - bh / 2), vh - bh - 10);
    } else if (side === "side") {
      side = "over"; bx = (vw - bw) / 2; by = vh - bh - 100;
    } else {
      bx = Math.min(Math.max(14, x + w / 2 - bw / 2), vw - bw - 14);
      by = side === "below" ? y + h + gap : y - gap - bh;
    }
    b.style.left = `${bx}px`;
    b.style.top = `${by}px`;
    tail.style.display = side === "over" ? "none" : "";
    if (side === "side") {
      Object.assign(tail.style, { left: "-7px", top: `${Math.min(Math.max(18, y + h / 2 - by - 9), bh - 36)}px`, bottom: "" });
    } else {
      Object.assign(tail.style, {
        left: `${Math.min(Math.max(18, x + w / 2 - bx - 9), bw - 36)}px`,
        top: side === "below" ? "-7px" : "",
        bottom: side === "below" ? "" : "-7px",
      });
    }
  }, [steps, step]);

  // Ouverture : repart de la première bulle.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setStep(0); setShown(false); }
  }
  // La bulle se cache le temps d'amener la cible suivante à l'écran.
  const goTo = (i: number) => { setShown(false); setStep(i); };

  // Changement de bulle : amène la cible au centre, puis mesure une fois le défilement fini.
  useEffect(() => {
    if (!open) return;
    document.querySelector(steps[step].target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => { place(); setShown(true); }, 380);
    return () => clearTimeout(t);
  }, [open, step, steps, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && step < steps.length - 1) { setShown(false); setStep(step + 1); }
      if (e.key === "ArrowLeft" && step > 0) { setShown(false); setStep(step - 1); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [open, step, steps.length, place, onClose]);

  if (!open || typeof document === "undefined") return null;
  const s = steps[step];
  const last = step === steps.length - 1;

  return createPortal(
    <div className="pilote-studio fixed inset-0 z-[80] font-sans">
      <div
        ref={spotRef}
        className="pointer-events-none fixed left-0 top-0 rounded-[14px] shadow-[0_0_0_9999px_rgba(8,16,28,0.58)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] after:absolute after:-inset-[3px] after:rounded-[17px] after:border-2 after:border-st-gold after:content-['']"
      />
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-label={s.title}
        className={
          "fixed left-0 top-0 w-[calc(100vw-28px)] max-w-[320px] rounded-[18px] bg-white px-[18px] pb-3.5 pt-[18px] shadow-[0_24px_50px_-16px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-200 " +
          (shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")
        }
      >
        <span ref={tailRef} className="absolute size-[18px] rotate-45 rounded-[3px] bg-white" />
        <div className="relative">
          <p className="st-num text-[11.5px] font-semibold tracking-[0.06em] text-st-gold-text">{step + 1} / {steps.length}</p>
          <h3 className="mb-1.5 mt-1 text-base font-bold leading-snug tracking-[-0.015em] text-st-ink">{s.title}</h3>
          <p className="text-[13.5px] leading-relaxed text-st-text-2">{s.text}</p>
          <div className="my-3.5 flex gap-[5px]">
            {steps.map((_, k) => (
              <i key={k} className={"h-1.5 rounded-full " + (k === step ? "w-[18px] bg-st-ink" : "w-1.5 bg-st-line-strong")} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className={last ? "invisible" : ""}>Passer</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="secondary" size="sm" onClick={() => goTo(step - 1)}>Retour</Button>}
              {last
                ? <Button size="sm" onClick={onClose}>Terminer</Button>
                : <Button size="sm" onClick={() => goTo(step + 1)}>Suivant <ArrowRight /></Button>}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
