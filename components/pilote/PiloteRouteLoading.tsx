// Écran de chargement des pages pilote (loading.tsx). Grâce à lui, la navigation
// est immédiate : Next affiche ceci dès le toucher, pendant que le serveur
// prépare la page. Le fondu retardé évite un flash quand la page arrive vite.
// Fondu via tw-animate-css (animate-in) : un @keyframes maison dans
// globals.css était retiré à la compilation, et l'indicateur restait invisible.
export function PiloteRouteLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="flex min-h-[60dvh] items-center justify-center animate-in fade-in fill-mode-both duration-200 delay-150"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-st-ink/15 border-t-st-ink" />
    </div>
  );
}
