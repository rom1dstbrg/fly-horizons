import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Users, ShieldCheck, Headphones, MapPin, CalendarCheck, Info, Route } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { VolDetailClient } from "@/components/shop/VolDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("title, short_description")
    .eq("slug", slug)
    .eq("product_type", "voucher")
    .eq("active", true)
    .single();
  if (!data) return {};
  return {
    title: `${data.title} — Fly Horizons`,
    description: data.short_description ?? undefined,
  };
}

const INCLUS = [
  { icon: <Users size={15} className="text-[#113356]" />,         label: "Jusqu'à 3 passagers" },
  { icon: <ShieldCheck size={15} className="text-[#113356]" />,   label: "Pilote certifié EASA" },
  { icon: <Headphones size={15} className="text-[#113356]" />,    label: "Casques audio inclus" },
  { icon: <MapPin size={15} className="text-[#113356]" />,        label: "Départ depuis Charleroi (EBCI)" },
  { icon: <CalendarCheck size={15} className="text-[#113356]" />, label: "Date au choix" },
  { icon: <Info size={15} className="text-[#113356]" />,          label: "Briefing de sécurité inclus" },
];

export default async function VolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: vol }, { data: autres }] = await Promise.all([
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("slug", slug)
      .eq("product_type", "voucher")
      .eq("active", true)
      .single(),
    supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("product_type", "voucher")
      .eq("active", true)
      .neq("slug", slug)
      .order("voucher_duration_minutes", { ascending: true }),
  ]);

  if (!vol) notFound();

  const duree = vol.voucher_duration_minutes ?? 60;
  const image = vol.images?.[0]?.url ?? null;

  return (
    <main className="bg-[#f5f5f7]">

      {/* ── Navigation ── */}
      <div className="pt-[98px] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto pt-6">
          <Link href="/packs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={15} />
            Tous les vols
          </Link>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* Visuel */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm aspect-[4/3] relative bg-[#0b2238] lg:sticky lg:top-28">
            {image ? (
              <Image src={image} alt={vol.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#113356] flex flex-col items-center justify-center gap-4">
                <div className="inline-flex items-center gap-2 bg-[#F2B705]/15 border border-[#F2B705]/30 rounded-full px-4 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705]" />
                  <span className="text-[#F2B705] text-xs font-bold tracking-[2px] uppercase">Vol privé · Fly Horizons</span>
                </div>
                <p className="text-white text-7xl font-black leading-none">{formatDuration(duree)}</p>
                <p className="text-white/40 text-sm">Au départ de Charleroi (EBCI)</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4">
              <span className="bg-[#F2B705] text-[#113356] text-xs font-bold px-3 py-1.5 rounded-full">
                {formatDuration(duree)}
              </span>
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-5">

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight mb-3">
                {vol.title}
              </h1>
              {vol.short_description && (
                <p className="text-muted-foreground text-base leading-relaxed">
                  {vol.short_description}
                </p>
              )}
            </div>

            {/* Réservation */}
            <VolDetailClient price={vol.price} duree={duree} />

            {/* Ce qui est inclus */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-xs font-bold text-foreground uppercase tracking-[2px] mb-4">Ce qui est inclus</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INCLUS.map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#f5f8ff] border border-[#dce8ff] flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                    <span className="text-xs text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Autres durées ── */}
      {(autres ?? []).length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
          <div className="border-t border-border pt-8">
            <p className="text-xs font-bold text-[#113356] uppercase tracking-[3px] mb-1">Autres durées disponibles</p>
            <h2 className="text-2xl font-extrabold text-foreground mb-5">Changer de durée</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(autres ?? []).map((p) => {
                const d = p.voucher_duration_minutes ?? 60;
                const img = p.images?.[0]?.url ?? null;
                return (
                  <Link key={p.id} href={`/vols/${p.slug}`} className="group flex">
                    <div className="flex w-full rounded-2xl overflow-hidden border border-border bg-white shadow-sm hover:shadow-md transition-all">
                      <div className="relative w-28 shrink-0 bg-[#0b2238]">
                        {img
                          ? <Image src={img} alt={p.title} fill className="object-cover" sizes="112px" />
                          : <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#113356] flex items-center justify-center">
                              <span className="text-white text-base font-black">{formatDuration(d)}</span>
                            </div>
                        }
                        <div className="absolute top-2 left-2">
                          <span className="bg-[#F2B705] text-[#113356] text-[10px] font-bold px-2 py-0.5 rounded-full">{formatDuration(d)}</span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <p className="text-sm font-bold text-foreground group-hover:text-[#113356] transition-colors leading-snug">{p.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#113356] font-black">{p.price}&nbsp;€</span>
                          <span className="text-xs text-muted-foreground group-hover:text-[#113356] transition-colors">Voir →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Vol sur mesure ── */}
      <div className="border-t border-border bg-white py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-foreground text-sm">Vous avez un itinéraire précis en tête ?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tracez votre route sur la carte — durée et prix calculés en temps réel.</p>
          </div>
          <Link href="/vol-sur-mesure" className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-sm font-semibold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all">
            <Route size={14} />
            Vol sur mesure
          </Link>
        </div>
      </div>

    </main>
  );
}
