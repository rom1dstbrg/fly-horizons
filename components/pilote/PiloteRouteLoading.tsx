// Écran de chargement des pages pilote (loading.tsx). Grâce à lui, la navigation
// est immédiate : Next affiche ceci dès le toucher, pendant que le serveur
// prépare la page. Le fondu retardé évite un flash quand la page arrive vite.
export function PiloteRouteLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="flex min-h-[50dvh] items-center justify-center opacity-0 motion-safe:animate-[st-fade-in_200ms_ease-out_150ms_forwards] motion-reduce:opacity-100"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-st-line-strong border-t-st-ink" />
    </div>
  );
}
