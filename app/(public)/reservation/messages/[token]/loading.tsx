// Squelette affiché pendant le chargement : même grille que la page (titre, colonne « Votre vol », bulles, saisie).
const bar = "animate-pulse rounded-full bg-[#edf0f7]";

function Bubble({ me, w, h = "h-11" }: { me?: boolean; w: string; h?: string }) {
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`animate-pulse rounded-[18px] ${me ? "bg-[#0b2238]/15" : "bg-[#edf0f7]"} ${w} ${h}`} />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-white" aria-busy="true" aria-label="Chargement de vos échanges">
      <div className="pt-page pb-0 lg:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 lg:grid lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-start">
          <div className="lg:col-start-1 lg:pr-[72px]">
            <div className={`${bar} mb-4 h-3 w-28`} />
            <div className={`${bar} h-9 w-[85%] max-w-[560px] lg:h-11`} />
          </div>

          <aside className="mt-[22px] lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:border-l lg:border-border lg:pl-[72px] lg:pt-1.5">
            <div className={`${bar} mb-3 h-3 w-20`} />
            <div className={`${bar} h-5 w-52`} />
            <div className={`${bar} mt-2 h-4 w-16`} />
            <div className="mt-4 flex items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#edf0f7]" />
              <div className="space-y-1.5">
                <div className={`${bar} h-3.5 w-32`} />
                <div className={`${bar} h-3 w-20`} />
              </div>
            </div>
          </aside>

          <div className="mt-7 space-y-2 lg:mt-9 lg:col-start-1 lg:pr-[72px]">
            <Bubble w="w-[70%] lg:w-[55%]" h="h-16" />
            <Bubble w="w-[45%] lg:w-[35%]" />
            <div className="pt-3"><Bubble me w="w-[62%] lg:w-[48%]" h="h-14" /></div>
            <div className="pt-3"><Bubble w="w-[76%] lg:w-[60%]" h="h-20" /></div>
          </div>

          <div className="mt-6 border-t border-border px-0 pb-3.5 pt-3 lg:col-start-1 lg:mt-5 lg:border-0 lg:pr-[72px] lg:pt-0">
            <div className="flex items-end gap-2.5">
              <div className="h-[46px] flex-1 animate-pulse rounded-[14px] bg-[#f5f5f7] lg:h-[50px]" />
              <div className="h-[46px] w-[46px] animate-pulse rounded-xl bg-primary/40 lg:h-[50px] lg:w-[132px]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
