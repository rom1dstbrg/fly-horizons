"use client";

import { useEffect, useRef, useState } from "react";

// Gestes des feuilles qui montent du bas (27/09) :
// - useSwipeToClose : au téléphone, glisser la feuille vers le bas la ferme.
//   Le geste ne démarre que vers le bas et quand le contenu touché est déjà
//   en haut de son défilement, pour ne jamais gêner la lecture. Les autres
//   façons de fermer (croix, fond, Échap) restent.
// - useScrollLock : la page derrière une feuille ouverte ne bouge plus.

const MOBILE = "(max-width: 639.98px)";
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.55; // px/ms

/** Adaptateur pour une feuille animée autrement que par style.transform (framer-motion). */
export type SwipeAdapter = {
  move: (px: number) => void;
  /** close = true : la feuille doit sortir, puis appeler `done`. */
  release: (close: boolean, done: () => void) => void;
};

function styleAdapter(el: HTMLElement): SwipeAdapter {
  return {
    move(px) {
      el.style.transition = "none";
      el.style.transform = `translateY(${px}px)`;
    },
    release(close, done) {
      el.style.transition = "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
      el.style.transform = close ? "translateY(100%)" : "translateY(0)";
      window.setTimeout(() => {
        if (close) done();
        // Rend la main aux classes (feuilles toujours montées, ex. Sheet).
        requestAnimationFrame(() => { el.style.transform = ""; el.style.transition = ""; });
      }, 200);
    },
  };
}

function scrollerOf(target: HTMLElement, root: HTMLElement): HTMLElement | null {
  for (let n: HTMLElement | null = target; n && n !== root.parentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
    if (n === root) break;
  }
  return null;
}

/**
 * Renvoie un ref à poser sur le panneau de la feuille. `enabled` : feuille
 * ouverte (et fermable : pas pour une étape obligatoire).
 */
export function useSwipeToClose<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  { enabled = true, adapter }: { enabled?: boolean; adapter?: SwipeAdapter } = {},
) {
  const [el, setEl] = useState<T | null>(null);
  const onCloseRef = useRef(onClose);
  const adapterRef = useRef(adapter);
  useEffect(() => { onCloseRef.current = onClose; adapterRef.current = adapter; });

  useEffect(() => {
    if (!el || !enabled) return;
    let startY = 0, startT = 0, dy = 0;
    let state: "idle" | "maybe" | "drag" | "off" = "idle";
    let scroller: HTMLElement | null = null;
    const a = () => adapterRef.current ?? styleAdapter(el);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !window.matchMedia(MOBILE).matches) { state = "off"; return; }
      const t = e.target as HTMLElement;
      if (t.closest(".leaflet-container, input[type=range], textarea, [data-no-swipe]")) { state = "off"; return; }
      scroller = scrollerOf(t, el);
      startY = e.touches[0].clientY;
      startT = performance.now();
      dy = 0;
      state = "maybe";
    };
    const onMove = (e: TouchEvent) => {
      if (state === "off" || state === "idle") return;
      dy = e.touches[0].clientY - startY;
      if (state === "maybe") {
        if (Math.abs(dy) < 6) return;
        if (dy < 0 || (scroller && scroller.scrollTop > 0)) { state = "off"; return; }
        state = "drag";
      }
      e.preventDefault();
      a().move(Math.max(0, dy));
    };
    const onEnd = () => {
      if (state === "drag") {
        const v = dy / Math.max(1, performance.now() - startT);
        const close = dy > CLOSE_DISTANCE || (v > CLOSE_VELOCITY && dy > 40);
        a().release(close, () => onCloseRef.current());
      }
      state = "idle";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [el, enabled]);

  return setEl;
}

// ── Blocage du défilement de la page ──────────────────────────────────────
// Compteur partagé : plusieurs feuilles peuvent s'empiler (tiroir + fenêtre
// de confirmation). body en position fixe : seule méthode fiable sur iPhone.
let locks = 0;
let saved: { y: number; body: string; html: string } | null = null;

function lock() {
  if (locks++ > 0) return;
  const { body, documentElement: html } = document;
  const y = window.scrollY;
  const gutter = window.innerWidth - html.clientWidth;
  saved = { y, body: body.getAttribute("style") ?? "", html: html.getAttribute("style") ?? "" };
  html.style.overflow = "hidden";
  Object.assign(body.style, {
    position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%", overflow: "hidden",
    paddingRight: gutter > 0 ? `${gutter}px` : body.style.paddingRight,
  });
}

function unlock() {
  if (--locks > 0 || !saved) return;
  const { body, documentElement: html } = document;
  body.setAttribute("style", saved.body);
  html.setAttribute("style", saved.html);
  window.scrollTo(0, saved.y);
  saved = null;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
