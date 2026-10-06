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

// ---------------------------------------------------------------------------
// Squelettes propres à chaque page : mêmes conteneurs, mêmes écarts, mêmes
// proportions que la page réelle, pour que rien ne bouge quand elle arrive.
// ---------------------------------------------------------------------------
const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const BLOCK = "animate-pulse bg-[#eef0f4]";

function Delay({ i, className }: { i: number; className: string }) {
  return <div style={{ animationDelay: `${i * 90}ms` }} className={`${BLOCK} ${className}`} />;
}

// En-tête des pages refaites : eyebrow, h1 34/52, texte.
function PageHead({ lines = 2, narrow = true }: { lines?: number; narrow?: boolean }) {
  return (
    <div className={`mb-10 lg:mb-14 ${narrow ? "max-w-[620px]" : ""}`}>
      <Bar className="h-[11px] w-40 mb-3" />
      <Bar className="h-[34px] lg:h-[52px] w-[85%]" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} className={`h-[14px] ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

// Carte d'annonce : photo 4/3 (3/4 dès sm), coins lg, comme AnnonceCard.
function CardSkeleton({ i = 0 }: { i?: number }) {
  return <Delay i={i} className="rounded-lg aspect-[4/3] sm:aspect-[3/4]" />;
}

export function OffresSkeleton() {
  return (
    <main className="bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-24 sm:pb-20">
        <div className={WRAP}>
          <PageHead />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} i={i} />)}
          </div>
        </div>
      </section>
    </main>
  );
}

export function GalerieSkeleton() {
  const cols = [
    ["aspect-[4/5]", "aspect-[4/3]", "aspect-[3/4]"],
    ["aspect-[4/3]", "aspect-[3/4]", "aspect-[4/5]"],
    ["aspect-[3/4]", "aspect-[4/5]", "aspect-[4/3]"],
  ];
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-24 sm:pb-20">
        <div className={WRAP}>
          <PageHead narrow={false} lines={1} />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {cols.map((col, c) => (
              <div key={c} className={`flex flex-col gap-2 sm:gap-3 ${c === 2 ? "hidden lg:flex" : ""}`}>
                {col.map((ratio, r) => <Delay key={r} i={c + r} className={`${ratio} rounded-lg`} />)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function VolSkeleton() {
  return (
    <main className="bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <div className={`${WRAP} pt-page`}>
        <Bar className="h-[13px] w-28 mb-3.5 lg:mb-[18px]" />
        <Bar className="h-[11px] w-56 mb-2.5" />
        <Bar className="h-[32px] lg:h-[56px] w-[80%] max-w-[900px]" />
        <div className="mt-3.5 lg:mt-[18px] flex gap-4">
          <Bar className="h-[18px] w-44" />
          <Bar className="h-[18px] w-24" />
          <Bar className="h-[18px] w-20" />
        </div>

        <div className={`${BLOCK} -mx-4 sm:-mx-6 lg:mx-0 mt-5 lg:mt-8 aspect-[4/3] lg:aspect-[21/8] lg:rounded-[14px]`} />

        <div className="lg:hidden py-[18px] border-b border-border">
          <Bar className="h-[11px] w-40 mb-2" />
          <Bar className="h-[28px] w-32" />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16 lg:items-start">
          <div>
            <section className="py-7 lg:py-10">
              <Bar className="h-6 w-28 mb-4" />
              <div className="space-y-2.5">
                <Bar className="h-[15px] w-full" />
                <Bar className="h-[15px] w-full" />
                <Bar className="h-[15px] w-3/4" />
              </div>
            </section>
            <section className="py-7 lg:py-10 border-t border-border">
              <Bar className="h-6 w-24 mb-4" />
              <Bar className="h-[15px] w-2/3 mb-3.5" />
              <div className={`${BLOCK} aspect-[16/9] lg:aspect-[21/9] rounded-xl`} />
            </section>
          </div>
          <aside className="hidden lg:block mt-10 pl-10 border-l border-border">
            <Bar className="h-[11px] w-40 mb-3" />
            <Bar className="h-[44px] w-40" />
            <Bar className="h-3 w-52 mt-3" />
            <Bar className="h-[22px] w-28 my-5" />
            <Bar className="h-[50px] w-full rounded-[10px]" />
            <div className="mt-5 space-y-3">
              <Bar className="h-[14px] w-5/6" />
              <Bar className="h-[14px] w-4/6" />
              <Bar className="h-[14px] w-5/6" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function ReserverSkeleton() {
  return (
    <main className="bg-white pb-16 lg:pb-24 flex-1" aria-busy="true" aria-label="Chargement">
      <div className={`${WRAP} pt-page`}>
        <Bar className="h-[13px] w-28 mb-3.5 lg:mb-[18px]" />
        <Bar className="h-[11px] w-24 mb-2.5" />
        <Bar className="h-[28px] lg:h-[40px] w-[60%] max-w-[560px]" />
        <Bar className="mt-3 h-[15px] w-full max-w-[520px]" />
        <div className="mt-8 pt-7 lg:mt-10 lg:pt-10 border-t border-border lg:grid lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <Bar className="h-[20px] w-36" />
              <div className="flex gap-2"><Bar className="h-9 w-9 rounded-lg" /><Bar className="h-9 w-9 rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => <Bar key={i} className="aspect-square rounded-lg" />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function PiloteSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-14 lg:pb-20">
        <div className={WRAP}>
          <Bar className="h-[11px] w-36 mb-3" />
          <div className="flex items-center gap-4 lg:gap-5">
            <div className={`${BLOCK} h-[72px] w-[72px] lg:h-24 lg:w-24 shrink-0 rounded-full`} />
            <Bar className="h-[34px] lg:h-[52px] w-64 lg:w-[420px]" />
          </div>
          <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="lg:pt-4 lg:pr-[88px] max-w-[640px] space-y-3">
              <Bar className="h-[18px] w-full" />
              <Bar className="h-[18px] w-full" />
              <Bar className="h-[18px] w-4/5" />
            </div>
            <div className="mt-7 lg:mt-0 lg:pt-4 lg:border-l lg:border-border lg:pl-[72px]">
              <Bar className="h-[11px] w-44 mb-3" />
              <div className="border-t border-border">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 border-b border-border py-3.5">
                    <Bar className="h-[18px] w-[18px] rounded-full" /><Bar className="h-[15px] w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-border py-10 lg:py-14">
        <div className={WRAP}>
          <Bar className="h-[11px] w-28 mb-3" />
          <Bar className="h-[26px] w-56" />
          <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2].map((i) => <CardSkeleton key={i} i={i} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
