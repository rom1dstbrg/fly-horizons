// Écrans de chargement : la silhouette de la page à venir, sur fond blanc
// (même fond que le contenu), au lieu d'un logo + anneau sur fond gris.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#eef0f4] ${className}`} />;
}

export function PageSkeleton() {
  return (
    <main className="bg-white pt-page pb-20 flex-1" aria-busy="true" aria-label="Chargement">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
        <Bar className="h-3 w-28" />
        <Bar className="mt-4 h-9 lg:h-12 w-3/4 max-w-[520px]" />
        <Bar className="mt-4 h-4 w-full max-w-[420px]" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ animationDelay: `${i * 120}ms` }} className="animate-pulse">
              <div className="aspect-[4/3] rounded-2xl bg-[#eef0f4]" />
              <div className="mt-4 h-4 w-2/3 rounded-md bg-[#eef0f4]" />
              <div className="mt-2 h-3 w-1/2 rounded-md bg-[#eef0f4]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function AccountSkeleton() {
  return (
    <main className="bg-white pt-page pb-20" aria-busy="true" aria-label="Chargement">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">
        <Bar className="h-3 w-24" />
        <Bar className="mt-4 h-9 lg:h-11 w-64" />
        <Bar className="mt-3 h-4 w-40" />
        <div className="mt-7 pt-6 lg:mt-9 lg:pt-8 border-t border-border lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-11">
          <div className="hidden lg:flex flex-col gap-2">
            <Bar className="h-10 w-full" />
            <Bar className="h-8 w-4/5" />
            <Bar className="h-8 w-3/5" />
          </div>
          <div className="flex flex-col gap-3">
            <Bar className="h-20 w-full rounded-xl" />
            <Bar className="h-20 w-full rounded-xl" />
            <Bar className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
