import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listOpenOffersForPilote } from "@/lib/pilote/offers";
import { EmptyState } from "@/components/admin/ui";

export const metadata = { title: "Offres à prendre — Espace pilote" };

function frDate(dateVol: string): string {
  return new Date(dateVol + "T12:00:00Z").toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expire bientôt";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "expire dans moins d'une heure";
  if (h < 24) return `expire dans ${h} h`;
  return `expire dans ${Math.floor(h / 24)} j`;
}

export default async function PiloteOffresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: pilote } = await admin.from("pilotes").select("id").eq("user_id", user!.id).single();

  const offers = pilote ? await listOpenOffersForPilote(pilote.id) : [];

  const th = "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Offres à prendre</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Des vols proposés à toute l&apos;équipe, premier arrivé premier servi. Ceux qui chevauchent un
          de vos vols n&apos;apparaissent pas ici.
        </p>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune offre en ce moment"
          description="Quand Romain met un vol en jeu, il apparaît ici et vous recevez un email."
        />
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Date</th>
                  <th className={`${th} text-center`}>Durée</th>
                  <th className={`${th} text-center`}>Passagers</th>
                  <th className={th}>Délai</th>
                  <th className={`${th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.token} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-foreground font-medium capitalize">{frDate(o.dateVol)}</span>
                      {o.heureVol && <span className="text-xs text-muted-foreground"> · {o.heureVol.slice(0, 5)}</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{o.duree} min</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{o.passagers}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{expiresIn(o.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/pilote/offre/${o.token}`}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-navy text-white text-xs font-semibold hover:brightness-90 transition-colors"
                      >
                        Voir l&apos;offre
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
