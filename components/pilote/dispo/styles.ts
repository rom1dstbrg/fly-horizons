import { cn } from "@/lib/utils";

// Rendu des cases de la grille de disponibilités (WeekGrid). Variantes @xl :
// requêtes de conteneur (largeur de la grille, pas de l'écran), pour que la
// démo du guide rende la version téléphone dans un cadre de téléphone.

export const GRID_COLS = "grid select-none grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1 @xl:grid-cols-[64px_repeat(7,minmax(0,1fr))] @xl:gap-1.5";

export const dayHeaderClass =
  "cursor-pointer rounded-[10px] px-0.5 pb-1.5 pt-1 text-center leading-tight text-st-text-2 transition-colors hover:bg-st-surface disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent @xl:pb-2 @xl:pt-1.5";

export const hourLabelClass =
  "st-num cursor-pointer rounded-[10px] pr-0.5 text-right text-[11px] font-[550] leading-tight text-st-text-2 transition-colors hover:bg-st-surface @xl:pr-2.5 @xl:text-xs";

export function cellClass({ reserved, open, past, dirty }: { reserved: boolean; open: boolean; past: boolean; dirty: boolean }) {
  return cn(
    "relative grid h-[46px] place-items-center overflow-hidden rounded-[8px] border px-0.5 text-[9.5px] font-semibold transition-colors @xl:h-[52px] @xl:rounded-[10px] @xl:text-[11.5px]",
    reserved
      ? "cursor-default border-st-ink bg-st-ink text-white"
      : open
        ? "cursor-pointer border-st-gold bg-st-gold-soft text-st-gold-text hover:bg-[#fbecb8]"
        // Hachuré = jour passé, plus modifiable ; gris uni = fermé, à toucher.
        : past
          ? "cursor-default border-transparent bg-[repeating-linear-gradient(135deg,var(--color-st-surface)_0_6px,#eceef2_6px_12px)]"
          : "cursor-pointer border-st-line bg-st-surface hover:bg-st-surface-hover",
    past && open && "cursor-default opacity-50",
    // Point = pas encore enregistré.
    dirty && "after:absolute after:right-1.5 after:top-1.5 after:size-1.5 after:rounded-full after:content-['']",
    dirty && (open ? "after:bg-st-gold-text" : "after:bg-st-ink"),
  );
}
