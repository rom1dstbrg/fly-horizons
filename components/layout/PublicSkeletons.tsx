// Squelettes des pages publiques restantes (voir PageSkeleton.tsx pour les
// premières). Même principe : mêmes conteneurs, écarts et proportions que la
// page réelle, pour que rien ne bouge quand elle arrive.
import { Bar, BLOCK, CardSkeleton, PageHead, WRAP } from "./PageSkeleton";

function Rows({ n, className = "" }: { n: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: n }).map((_, i) => (
        <Bar key={i} className={`h-[15px] ${i === n - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

// Section de landing : eyebrow + h2.
function SectionHead({ w = "w-72" }: { w?: string }) {
  return (
    <div className="mb-9 lg:mb-14">
      <Bar className="h-[11px] w-32 mb-3" />
      <Bar className={`h-[30px] lg:h-[40px] ${w} max-w-full`} />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <main className="bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="relative h-[70vh] lg:h-screen min-h-[480px] bg-gradient-to-br from-[#0b2238] via-[#0e3060] to-[#1a4a8a]">
        <div className={`${WRAP} h-full flex flex-col justify-end pb-16 lg:pb-24`}>
          <div className="animate-pulse h-[11px] w-44 rounded-md bg-white/20 mb-4" />
          <div className="animate-pulse h-[40px] lg:h-[72px] w-[85%] max-w-[760px] rounded-md bg-white/20" />
          <div className="animate-pulse mt-3 h-[40px] lg:h-[72px] w-[55%] max-w-[500px] rounded-md bg-white/20" />
          <div className="animate-pulse mt-8 h-[50px] w-48 rounded-[10px] bg-primary/50" />
        </div>
      </section>
      <section className="border-b border-border">
        <div data-xs-grid className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="py-6 lg:py-9 pr-4 space-y-2">
              <Bar className="h-[26px] w-24" />
              <Bar className="h-[13px] w-32" />
            </div>
          ))}
        </div>
      </section>
      <section className="py-14 lg:py-28">
        <div className={WRAP}>
          <SectionHead />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} i={i} />)}
          </div>
        </div>
      </section>
      <section className="bg-[#f5f5f7] py-14 lg:py-28">
        <div className={WRAP}>
          <SectionHead w="w-96" />
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Bar className="h-[40px] w-12 bg-white" />
                <Bar className="h-5 w-40 bg-white" />
                <Rows n={3} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// 7fr (texte + formulaire) | 5fr (infos) : contact, candidature pilote.
export function ContactSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={`${WRAP} lg:grid lg:grid-cols-[7fr_5fr] lg:gap-x-20`}>
          <div>
            <PageHead lines={2} />
            <div className="max-w-[720px] space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Bar className="h-[50px] rounded-[10px]" />
                <Bar className="h-[50px] rounded-[10px]" />
              </div>
              <Bar className="h-[50px] rounded-[10px]" />
              <Bar className="h-[140px] rounded-[10px]" />
              <Bar className="h-[50px] w-44 rounded-[10px]" />
            </div>
          </div>
          <div className="mt-12 lg:mt-0 lg:pt-6 space-y-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3.5">
                <Bar className="h-[38px] w-[38px] shrink-0 rounded-[10px]" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-[14px] w-32" />
                  <Bar className="h-[14px] w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// Sommaire (260 px) + corps : politique, CGP, FAQ.
export function LegalSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-16 lg:pb-24">
        <div className={`${WRAP} lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-24`}>
          <div className="lg:col-span-2"><PageHead lines={2} /></div>
          <aside className="hidden lg:block space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <Bar key={i} className="h-[14px] w-4/5" />)}
          </aside>
          <div className="max-w-[760px] space-y-10">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Bar className="h-[26px] w-64 mb-4" />
                <Rows n={4} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function AboutSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-10 lg:pb-24">
        <div className={`${WRAP} grid lg:grid-cols-2 lg:gap-x-[72px]`}>
          <div>
            <Bar className="h-[11px] w-32 mb-3" />
            <Bar className="h-[34px] lg:h-[52px] w-[90%]" />
            <Bar className="mt-3 h-[34px] lg:h-[52px] w-[60%]" />
            <Rows n={4} className="mt-6" />
          </div>
          <div className={`${BLOCK} -mx-4 sm:-mx-6 lg:mx-0 mt-6 lg:mt-0 aspect-[4/3] lg:aspect-auto lg:min-h-[420px] lg:rounded-[14px]`} />
        </div>
      </section>
      <section className="bg-[#f5f5f7] py-10 lg:py-24">
        <div className={`${WRAP} grid lg:grid-cols-2 lg:gap-x-[72px] gap-8`}>
          <div>
            <Bar className="h-[11px] w-28 mb-3 bg-white" />
            <Bar className="h-[30px] lg:h-[40px] w-4/5 bg-white" />
            <Rows n={3} className="mt-5" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-24 bg-white rounded-xl" />)}
          </div>
        </div>
      </section>
      <section className="py-10 lg:py-24">
        <div className={WRAP}>
          <SectionHead />
          <div className="grid lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => <Bar key={i} className="h-40 rounded-xl" />)}
          </div>
        </div>
      </section>
    </main>
  );
}

export function DevenirPiloteSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-12 lg:pb-24">
        <div className={`${WRAP} grid gap-9 lg:grid-cols-[7fr_5fr] lg:gap-x-[88px] lg:items-end`}>
          <div>
            <PageHead lines={3} />
            <Bar className="h-[50px] w-52 rounded-[10px]" />
          </div>
          <div className="space-y-3">
            <Bar className="h-[11px] w-36" />
            {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-[15px] w-full" />)}
          </div>
        </div>
      </section>
      <section className="py-12 lg:py-24">
        <div className={WRAP}>
          <SectionHead w="w-80" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid gap-2 py-5 border-b border-border lg:grid-cols-[240px_1fr] lg:gap-x-10 lg:py-[26px]">
              <Bar className="h-5 w-40" />
              <Rows n={2} />
            </div>
          ))}
        </div>
      </section>
      <section className="bg-[#f5f5f7] py-12 lg:py-24">
        <div className={WRAP}>
          <SectionHead w="w-96" />
          <div className="grid lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => <Bar key={i} className="h-32 bg-white rounded-xl" />)}
          </div>
        </div>
      </section>
    </main>
  );
}

export function AccesSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={WRAP}>
          <PageHead lines={2} />
          <div className={`${BLOCK} -mx-4 sm:mx-0 aspect-video lg:aspect-[21/9] sm:rounded-[14px]`} />
          <div className="mt-9 lg:mt-12 flex flex-col gap-9 lg:grid lg:grid-cols-4 lg:gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Bar className="h-[30px] w-10" />
                <Bar className="h-5 w-32" />
                <Rows n={2} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// Page courte : désinscription (à gauche), satisfaction (centrée).
export function NoticeSkeleton({ centered = false }: { centered?: boolean }) {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-24 lg:pb-32">
        <div className={`${WRAP} ${centered ? "max-w-[560px] flex flex-col items-center pt-6 lg:pt-12" : ""}`}>
          <Bar className="h-11 w-11 rounded-full mb-5" />
          <Bar className="h-[32px] lg:h-[44px] w-[75%] max-w-[480px]" />
          <Rows n={2} className="mt-4 w-full max-w-[520px]" />
          <Bar className="mt-7 h-[48px] w-48 rounded-[10px]" />
        </div>
      </section>
    </main>
  );
}

// Confirmation / paiement : pastille + titre, puis 7 colonnes de détails | résumé.
export function ConfirmSkeleton() {
  return (
    <main className="bg-white pt-page pb-16 lg:pb-24 flex-1" aria-busy="true" aria-label="Chargement">
      <div className={WRAP}>
        <div className="max-w-[680px]">
          <Bar className="h-12 w-12 rounded-full mb-5" />
          <Bar className="h-[32px] lg:h-[44px] w-[80%]" />
          <Rows n={2} className="mt-4 max-w-[560px]" />
        </div>
        <div className="mt-9 pt-8 lg:mt-12 lg:pt-10 border-t border-border lg:grid lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3.5">
                <Bar className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-[16px] w-48" />
                  <Bar className="h-[14px] w-4/5" />
                </div>
              </div>
            ))}
            <Bar className="h-[50px] w-56 rounded-[10px]" />
          </div>
          <div className="mt-10 lg:mt-0 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-border lg:pl-10 space-y-4">
            <Bar className="h-[11px] w-28" />
            {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-[15px] w-full" />)}
          </div>
        </div>
      </div>
    </main>
  );
}

// Créneau proposé : titre, puis bandeau 3 colonnes (ancien | flèche | nouveau).
export function CreneauSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={WRAP}>
          <Bar className="h-[11px] w-28 mb-3" />
          <Bar className="h-[32px] lg:h-[44px] w-[70%] max-w-[560px]" />
          <Rows n={2} className="mt-3.5 max-w-[520px]" />
          <div className="mt-7 lg:mt-11 lg:py-9 lg:border-y lg:border-border lg:grid lg:grid-cols-[1fr_auto_1.3fr] lg:gap-x-14 lg:items-center space-y-5 lg:space-y-0">
            <Bar className="h-24 rounded-xl" />
            <Bar className="hidden lg:block h-8 w-8 rounded-full" />
            <Bar className="h-28 rounded-xl" />
          </div>
          <div className="mt-8 flex gap-3">
            <Bar className="h-[50px] w-44 rounded-[10px]" />
            <Bar className="h-[50px] w-36 rounded-[10px]" />
          </div>
        </div>
      </section>
    </main>
  );
}

// Proposition de vol : 8fr (titre, photo) | 4fr (résumé + action).
export function PropositionSkeleton() {
  return (
    <main className="min-h-screen bg-white flex-1" aria-busy="true" aria-label="Chargement">
      <section className="pt-page pb-16 lg:pb-28">
        <div className={`${WRAP} lg:grid lg:grid-cols-[8fr_4fr] lg:gap-x-16 lg:items-start`}>
          <div>
            <Bar className="h-[11px] w-40 mb-3" />
            <Bar className="h-[30px] lg:h-[44px] w-[75%] max-w-[560px]" />
            <div className={`${BLOCK} mt-6 -mx-4 sm:mx-0 sm:rounded-[14px] aspect-[4/3] lg:aspect-auto lg:min-h-[470px] lg:mt-8`} />
          </div>
          <div className="mt-8 lg:mt-0 lg:pt-6 space-y-4">
            <Bar className="h-[11px] w-28" />
            <Bar className="h-[40px] w-40" />
            <Rows n={3} />
            <Bar className="h-[50px] w-full rounded-[10px]" />
          </div>
        </div>
      </section>
    </main>
  );
}
