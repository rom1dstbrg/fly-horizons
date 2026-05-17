import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Users, ShieldCheck, Headphones, MapPin, CalendarCheck, Info, Route } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";
import { VolDetailClient } from "@/components/shop/VolDetailClient";
import { VolImageGallery } from "@/components/shop/VolImageGallery";

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
  { icon: <ShieldCheck size={15} className="text-[#113356]" />,   label: "Briefing sécurité inclus" },
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
  const image = vol.images?.[0]?.url ?? null; // utilisé dans VolDetailClient (image_url)

  return (
    <main className="bg-[#f5f5f7]">

      {/* ── Navigation ── */}
      <div className="pt-[98px] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto pt-5">
          <Link href="/nos-offres" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={15} />
            Tous les vols
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-10 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-14 items-start">

          {/* ── Colonne gauche : galerie + ce qui est inclus ── */}
          <div className="space-y-4">
            <VolImageGallery
              images={vol.images ?? []}
              title={vol.title}
              duree={duree}
            />

            {/* Ce qui est inclus */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-xs font-bold text-foreground uppercase tracking-[2px] mb-4">Ce qui est inclus</p>
              <div className="grid grid-cols-2 gap-3">
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

          {/* ── Colonne droite : infos + CTA ── */}
          <div className="space-y-6 lg:pt-1">

            {/* Titre & description */}
            <div>

              <h1 className="text-[40px] sm:text-[50px] font-black text-[#0b2238] leading-[1.0] tracking-tight mb-4">
                {vol.title}
              </h1>

              {vol.short_description && (
                <p className="text-[#0b2238]/65 text-[15px] leading-relaxed mb-3">
                  {vol.short_description}
                </p>
              )}

              <p className="text-muted-foreground/55 text-[12px] leading-relaxed">
                Au départ de Charleroi · EBCI · Date au choix
              </p>
            </div>

            {/* Réservation / Achat cadeau */}
            <VolDetailClient
              id={vol.id}
              slug={vol.slug}
              title={vol.title}
              price={vol.price}
              duree={duree}
              image_url={image}
            />

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
                          <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/15 rounded-lg px-2 py-1">
                            <span className="text-[#F2B705] font-black text-[10px] leading-none">{formatDuration(d)}</span>
                          </div>
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
