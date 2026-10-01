"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Page légale (CGP, confidentialité), nouvelle DA, même structure que la FAQ (01/10) :
// titre sur 2 colonnes, sommaire collant 260 px | texte ; téléphone : pastilles collées sous le header.
// Aucune boîte : sections séparées par des filets, texte toujours déplié (lisible, imprimable, Ctrl+F).

export type LegalBlock = string | { ul: string[] };
export interface LegalSection {
  id: string;
  title: string;
  /** Libellé court pour le sommaire (sinon le titre). */
  short?: string;
  blocks: LegalBlock[];
}
interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  /** Une ligne de repères sous le titre : « Version 2.0 », « Mise à jour… ». */
  meta: string[];
  /** Mise en garde de fond, en tête (filet doré, sans boîte). */
  notice?: { title: string; text: string };
  sections: LegalSection[];
  footer: { title: string; text: string; href: string; cta: string };
}

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10";
const lk = "font-semibold text-[#0b2238] underline decoration-[#0b2238]/25 underline-offset-[3px] hover:decoration-primary transition-colors";

// Espace insécable avant ? ! : ; pour éviter la ponctuation orpheline en fin de ligne.
const nb = (s: string) => s.replace(/ ([?!:;»])/g, " $1").replace(/(«) /g, "$1 ");

// **gras** et [texte](lien) ; un lien interne passe par next/link, un mailto/externe par <a>.
function inline(text: string) {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(nb(text.slice(last, m.index)));
    if (m[1]) {
      out.push(<strong key={i++} className="font-bold text-foreground">{nb(m[1])}</strong>);
    } else {
      const href = m[3];
      out.push(
        href.startsWith("/") ? (
          <Link key={i++} href={href} className={lk}>{m[2]}</Link>
        ) : (
          <a key={i++} href={href} className={lk} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[2]}</a>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(nb(text.slice(last)));
  return out.map((n, k) => <Fragment key={k}>{n}</Fragment>);
}

export function LegalDoc({ eyebrow, title, intro, meta, notice, sections, footer }: Props) {
  const [activeId, setActiveId] = useState(sections[0].id);
  const lockSpy = useRef(false);
  const chipsRef = useRef<HTMLElement>(null);

  // Section active selon le défilement (la dernière dont le haut est passé sous le header).
  useEffect(() => {
    function spy() {
      if (lockSpy.current) return;
      let cur = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(`s-${s.id}`);
        if (el && el.getBoundingClientRect().top < 180) cur = s.id;
      }
      setActiveId(cur);
    }
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    return () => window.removeEventListener("scroll", spy);
  }, [sections]);

  // La pastille active reste visible dans la rangée (téléphone).
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    const bar = chipsRef.current;
    if (!chip || !bar || bar.offsetParent === null) return;
    bar.scrollTo({ left: chip.offsetLeft - (bar.clientWidth - chip.clientWidth) / 2, behavior: "smooth" });
  }, [activeId]);

  function goTo(id: string) {
    setActiveId(id);
    lockSpy.current = true;
    window.setTimeout(() => { lockSpy.current = false; }, 900);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="pt-page pb-16 lg:pb-24">
        <div className={`${WRAP} lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-24`}>

          {/* En-tête (2 colonnes) */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">{eyebrow}</p>
            <h1 className="text-[34px] lg:text-[52px] font-black text-foreground leading-[1.03] tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-3 max-w-[620px] text-[15px] leading-[1.7] text-foreground/70">{nb(intro)}</p>
            <p className="mt-4 text-[13px] font-semibold text-muted-foreground">{meta.join("  ·  ")}</p>
          </div>

          {/* Sommaire (ordinateur) : collé pendant la lecture */}
          <nav
            aria-label="Sommaire"
            className="hidden lg:block lg:col-start-1 lg:row-start-2 lg:row-span-3 lg:mt-12 self-start sticky top-[110px]"
          >
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground mb-3">Sommaire</p>
            {sections.map((s, i) => {
              const on = activeId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  className={`w-full flex gap-2.5 py-2.5 pl-3.5 text-left text-sm font-semibold leading-snug border-l-2 transition-colors cursor-pointer ${
                    on ? "text-foreground border-primary" : "text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <span className="w-5 shrink-0 text-xs font-medium pt-px">{i + 1}.</span>
                  {s.short ?? s.title}
                </button>
              );
            })}
          </nav>

          {/* Pastilles (téléphone) : collées sous le header */}
          <nav
            ref={chipsRef}
            aria-label="Sommaire"
            className="lg:hidden sticky top-[72px] z-30 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-2.5 bg-white border-b border-border flex gap-2 overflow-x-auto no-scrollbar"
          >
            {sections.map((s, i) => (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => goTo(s.id)}
                className={`shrink-0 px-3.5 py-2 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeId === s.id ? "bg-[#0b2238] border-[#0b2238] text-white" : "bg-white border-border text-muted-foreground"
                }`}
              >
                {i + 1}. {s.short ?? s.title}
              </button>
            ))}
          </nav>

          {/* Texte */}
          <div className="pt-6 lg:pt-12 lg:col-start-2 lg:row-start-2 max-w-[760px]">
            {notice && (
              <div className="mb-2 border-l-2 border-primary pl-4 lg:pl-5">
                <p className="text-[11px] font-bold uppercase tracking-[2px] text-foreground mb-1.5">{notice.title}</p>
                <p className="text-[15px] leading-[1.75] text-foreground/75">{inline(notice.text)}</p>
              </div>
            )}

            {sections.map((s, i) => (
              <section key={s.id} id={`s-${s.id}`} className="pt-8 lg:pt-10 scroll-mt-[136px] lg:scroll-mt-[110px]">
                <h2 className="mb-4 flex gap-3 text-[22px] lg:text-[26px] font-black leading-tight text-foreground tracking-[-0.01em]">
                  <span className="text-muted-foreground/60">{i + 1}.</span>
                  <span>{nb(s.title)}</span>
                </h2>
                <div className="space-y-4 border-b border-border pb-8 lg:pb-10">
                  {s.blocks.map((b, k) =>
                    typeof b === "string" ? (
                      <p key={k} className="text-[15px] lg:text-base leading-[1.75] text-foreground/75">{inline(b)}</p>
                    ) : (
                      <ul key={k} className="space-y-2 pl-5 list-disc marker:text-primary text-[15px] lg:text-base leading-[1.75] text-foreground/75">
                        {b.ul.map((li, j) => <li key={j}>{inline(li)}</li>)}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Fin : pas de bloc, une action */}
          <div className="mt-10 lg:mt-12 lg:col-start-2 lg:row-start-3 max-w-[760px]">
            <h2 className="text-2xl lg:text-[28px] font-black text-foreground tracking-[-0.01em]">{nb(footer.title)}</h2>
            <p className="mt-2 mb-5 max-w-[460px] text-[15px] leading-[1.7] text-foreground/70">{nb(footer.text)}</p>
            <Link
              href={footer.href}
              className="inline-flex items-center gap-2 px-[22px] py-[13px] bg-primary text-[#0b2238] rounded-[10px] text-sm font-black hover:bg-[#e6a800] transition-colors shadow-gold"
            >
              {footer.cta}
              <ArrowRight size={15} />
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
