import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Clock, Users, MapPin, Route } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

export const metadata = {
  title: "Nos vols — Fly Horizons",
  description: "Choisissez votre vol privé en avion léger au départ de Charleroi (EBCI). De 30 minutes à 2 heures.",
};

export default async function PacksPage() {
  const supabase = await createClient();

  const { data: packs } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("active", true)
    .eq("product_type", "voucher")
    .order("voucher_duration_minutes", { ascending: true });

  return (
    <main className="bg-[#f5f5f7]">

      {/* ── En-tête ── */}
      <div className="pt-[98px] pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold text-[#113356] uppercase tracking-[3px] mb-2">Au départ de Charleroi · EBCI</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">Choisissez votre vol</h1>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
            Sélectionnez la durée qui vous convient. Vous choisirez votre date et créneau à l&apos;étape suivante.
          </p>
        </div>
      </div>

      {/* ── Grille packs ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {(!packs || packs.length === 0) ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Aucun vol disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {packs.map((pack) => {
              const duree = pack.voucher_duration_minutes ?? 60;
              const image = pack.images?.[0]?.url ?? null;

              return (
                <Link key={pack.id} href={`/vols/${pack.slug}`} className="group flex h-full">
                  <div className="flex flex-col w-full rounded-2xl overflow-hidden border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-300">

                    {/* Visuel */}
                    <div className="relative h-48 bg-[#0b2238] overflow-hidden shrink-0">
                      {image ? (
                        <Image
                          src={image}
                          alt={pack.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0b2238] to-[#113356] flex flex-col items-center justify-center gap-2">
                          <span className="text-4xl font-black text-white leading-none">
                            {formatDuration(duree)}
                          </span>
                          <span className="text-[#F2B705] text-xs font-semibold tracking-widest uppercase opacity-80">
                            Vol privé
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="bg-[#F2B705] text-[#113356] text-xs font-bold px-2.5 py-1 rounded-full">
                          {formatDuration(duree)}
                        </span>
                      </div>
                    </div>

                    {/* Infos */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-foreground text-sm leading-snug mb-1.5 group-hover:text-[#113356] transition-colors">
                        {pack.title}
                      </h3>
                      <p className="text-muted-foreground text-xs leading-relaxed flex-1 line-clamp-3">
                        {pack.short_description ?? ""}
                      </p>
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <span className="text-[#113356] font-black text-xl">{pack.price}&nbsp;€</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#113356] bg-[#f5f8ff] border border-[#dce8ff] rounded-lg px-3 py-1.5 group-hover:bg-[#113356] group-hover:text-white group-hover:border-[#113356] transition-all">
                          Réserver →
                        </span>
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Autre option ── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="bg-[#0b2238] rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <p className="text-[#F2B705] text-xs font-bold tracking-[2px] uppercase mb-1">Envie de plus de liberté ?</p>
              <p className="text-white font-bold text-base leading-snug">Tracez votre propre itinéraire</p>
              <p className="text-white/50 text-xs mt-1.5 leading-relaxed">
                Choisissez vos points de survol sur la carte. Route optimisée en temps réel.
              </p>
            </div>
            <Link
              href="/vol-sur-mesure"
              className="self-start inline-flex items-center gap-2 px-4 py-2 bg-[#F2B705] text-[#113356] rounded-xl text-xs font-bold hover:bg-[#e6a800] transition-colors"
            >
              <Route size={13} />
              Vol sur mesure
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div>
              <p className="text-[#113356] text-xs font-bold tracking-[2px] uppercase mb-1">Offrir un vol ?</p>
              <p className="text-foreground font-bold text-base leading-snug">Voucher cadeau</p>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                Code envoyé par email immédiatement après l&apos;achat. Valable 1 an.
              </p>
            </div>
            <Link
              href="/vouchers"
              className="self-start inline-flex items-center gap-2 px-4 py-2 bg-[#f5f8ff] border border-[#dce8ff] text-[#113356] rounded-xl text-xs font-bold hover:bg-[#113356] hover:text-white hover:border-[#113356] transition-all"
            >
              Voir les vouchers
            </Link>
          </div>

        </div>

      </div>

      {/* ── Barre d'infos ── */}
      <div className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: <Users size={15} className="text-[#113356]" />, text: "Jusqu'à 3 passagers" },
              { icon: <MapPin size={15} className="text-[#113356]" />, text: "Décollage depuis Charleroi (EBCI)" },
              { icon: <Clock size={15} className="text-[#113356]" />, text: "Durées de 30 min à 2 h" },
              { icon: <Route size={15} className="text-[#113356]" />, text: "Itinéraire flexible" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                {icon}
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  );
}
