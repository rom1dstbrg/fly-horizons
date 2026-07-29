interface StatGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
}

// Sur mobile : bande défilante horizontale (une seule ligne, ne bouffe pas la hauteur
// d'écran) — le -mx-4/px-4 laisse la bande défiler jusqu'aux bords de l'écran.
// À partir de sm: grille normale figée, comme avant le passage au mobile-first.
const BASE = "no-scrollbar flex overflow-x-auto gap-2 -mx-4 px-4 pb-1 snap-x snap-mandatory sm:grid sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:snap-none";

const COLS: Record<number, string> = {
  2: `${BASE} sm:grid-cols-2`,
  3: `${BASE} sm:grid-cols-3`,
  4: `${BASE} sm:grid-cols-4`,
  5: `${BASE} sm:grid-cols-5`,
  6: `${BASE} sm:grid-cols-6`,
};

export function StatGrid({ children, cols = 4 }: StatGridProps) {
  return (
    <div className={COLS[cols]}>
      {children}
    </div>
  );
}
