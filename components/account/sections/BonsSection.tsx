import Link from "next/link";
import { Ticket, Download, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/vouchers";

// Nouvelle DA (28/09) : sans boîte, filets. N'apparaît dans le hub que s'il y a
// au moins un bon (voir AccountTabs) ; l'état vide reste ici en filet de sécurité.

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  unused:   { label: "Disponible", color: "bg-green-50 text-green-700 border-green-200" },
  reserved: { label: "Réservé",    color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  used:     { label: "Utilisé",    color: "bg-secondary text-muted-foreground border-border" },
  expired:  { label: "Expiré",     color: "bg-red-50 text-red-700 border-red-200" },
};

export interface VoucherCode {
  id: string;
  code: string;
  duration_minutes: number;
  status: string;
  order_id: string | null;
  product_title?: string | null;
  expires_at?: string | null;
}

const BTN = "inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-border bg-white text-foreground hover:border-foreground text-xs font-semibold transition-colors";

export function BonsSection({ vouchers }: { vouchers: VoucherCode[] }) {
  if (vouchers.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
          <Ticket size={18} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Aucun bon de vol</p>
        <p className="text-xs text-muted-foreground mt-1">Achetez une offre pour recevoir votre bon.</p>
        <Link href="/nos-offres" className="inline-flex items-center gap-1 mt-4 text-xs text-foreground font-semibold hover:text-primary transition-colors">
          Voir les offres <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {vouchers.map((v) => {
        const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.expired;
        return (
          <div key={v.id} className={`py-5 border-b border-border last:border-b-0 ${v.status !== "unused" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div>
                <p className="font-mono text-[13.5px] font-bold tracking-widest text-foreground">{v.code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDuration(v.duration_minutes)} de vol
                  {v.product_title ? ` · ${v.product_title}` : ""}
                </p>
                {v.expires_at && v.status === "unused" && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Expire le {new Date(v.expires_at).toLocaleDateString("fr-BE")}
                  </p>
                )}
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold shrink-0 ${st.color}`}>
                {st.label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {v.status === "unused" && (
                <Link href={`/reservation?duree=${v.duration_minutes}&code=${encodeURIComponent(v.code)}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-primary text-[#0b2238] text-xs font-bold hover:bg-[#e6a800] transition-colors">
                  Utiliser ce bon
                </Link>
              )}
              <a href={`/api/voucher/pdf?code=${encodeURIComponent(v.code)}`} download className={BTN}>
                <Download size={13} /> Imprimer le bon
              </a>
              {v.order_id && (
                <a href={`/api/invoice/${v.order_id}?type=detaillee`} download className={BTN}>
                  <Download size={13} /> Reçu
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
