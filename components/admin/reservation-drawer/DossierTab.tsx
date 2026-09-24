"use client";

import { useState } from "react";
import { Lock, Ticket, Save, ChevronDown, Calculator, Mail, Sparkles, Send, Loader2, Check } from "lucide-react";
import { ACTION_LABELS } from "@/components/admin/ui/AdminBadge";
import { Button, Input, Select, Textarea } from "@/components/pilote/studio";
import { cn } from "@/lib/utils";
import { EMAIL_TEMPLATES, FIELD_LABELS, type DrawerReservation, type EmailTemplate, type HistoryItem } from "./types";
import type { PendingAction } from "./ConfirmActionDialog";

// ── Onglet Dossier (maquette v2 validée le 24/09) ─────────────────────────
// Ce qui était « Modifier » + « Historique » : les champs de la réservation
// (lecture seule pour le pilote, sauf passagers / poids sur ses annonces), le
// bouton d'enregistrement, puis l'historique. Admin : Bilan vol et Email libre,
// repliés en bas.

type Fields = {
  prenom: string; nom: string; email: string; telephone: string;
  date: string; heure: string; duree: string; passagers: string; poids: string;
  acompte: string; paye: string; remboursement: string;
  voucherCode: string; couponCode: string; commentaire: string;
  styleVol: "rapide" | "vues" | "";
};
type Setters = {
  setPrenom: (v: string) => void; setNom: (v: string) => void; setEmail: (v: string) => void; setTelephone: (v: string) => void;
  setDate: (v: string) => void; setHeure: (v: string) => void; setDuree: (v: string) => void;
  setPassagers: (v: string) => void; setPoids: (v: string) => void;
  setAcompte: (v: string) => void; setPaye: (v: string) => void; setRemboursement: (v: string) => void;
  setVoucherCode: (v: string) => void; setCouponCode: (v: string) => void; setCommentaire: (v: string) => void;
  setStyleVol: (v: "rapide" | "vues" | "") => void;
};

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-[12px] font-[550] text-st-text-2">{label}</span>
      {children}
    </label>
  );
}

function Fold({ icon: Icon, title, hint, children }: { icon: React.ComponentType<{ size?: number }>; title: string; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[14px] border border-st-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-3 text-left text-[13px] font-[550] text-st-text">
        <Icon size={15} />
        {title}
        {hint && <span className="ml-auto text-[12px] font-normal text-st-muted">{hint}</span>}
        <ChevronDown size={15} className={cn("shrink-0 text-st-muted transition-transform", !hint && "ml-auto", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

function authorLabel(a: string | null | undefined): string {
  if (!a) return "Admin";
  if (a === "client") return "Client";
  if (a.startsWith("pilote:")) return `Pilote · ${a.slice(7)}`;
  return "Admin";
}

export function DossierTab({
  reservation: r,
  viewerRole,
  fields, setters,
  isSaving, onSave, onSavePassagersPoids,
  history,
  bilan,
  isPending,
  onApplyTemplate,
  onOpenEmailComposer,
  ask,
}: {
  reservation: DrawerReservation;
  viewerRole: "admin" | "pilote";
  fields: Fields;
  setters: Setters;
  isSaving: boolean;
  onSave: () => void;
  onSavePassagersPoids: () => void;
  history: { loading: boolean; loaded: boolean; items: HistoryItem[] };
  bilan: {
    dureeReelle: string; setDureeReelle: (v: string) => void;
    tarifEcole: number | null; coutEcole: number | null; resultat: number | null; dureeR: number;
    isPending: boolean; save: () => void;
  };
  isPending: boolean;
  onApplyTemplate: (tpl: EmailTemplate, includeReschedule: boolean) => void;
  onOpenEmailComposer: () => void;
  ask: (a: PendingAction) => void;
}) {
  const isAdmin = viewerRole === "admin";
  const ro = !isAdmin;
  const annonceEditable = !isAdmin && r.type_resa === "annonce_pilote";
  const isPerso = r.type_resa === "perso";
  const inputRo = "disabled:cursor-default disabled:opacity-100 disabled:bg-st-surface disabled:text-st-text-2";

  return (
    <div className="space-y-5">
      {ro && (
        <p className="flex items-center gap-2 rounded-[12px] bg-st-surface px-3 py-2.5 text-[12.5px] text-st-text-2">
          <Lock size={14} className="shrink-0" />
          {annonceEditable
            ? "Sur votre annonce, seuls les passagers et le poids sont modifiables. Pour le reste, écrivez à Romain."
            : "Informations en lecture seule. Pour un changement, écrivez à Romain."}
        </p>
      )}

      <section className="space-y-2.5">
        <h3 className="text-[13px] font-semibold text-st-text">Client</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <F label="Prénom"><Input value={fields.prenom} onChange={(e) => setters.setPrenom(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Nom"><Input value={fields.nom} onChange={(e) => setters.setNom(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Email" className="col-span-2"><Input type="email" value={fields.email} onChange={(e) => setters.setEmail(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Téléphone" className="col-span-2"><Input type="tel" value={fields.telephone} onChange={(e) => setters.setTelephone(e.target.value)} disabled={ro} placeholder="Optionnel" className={inputRo} /></F>
        </div>
      </section>

      <section className="space-y-2.5">
        <h3 className="text-[13px] font-semibold text-st-text">Vol</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <F label="Date"><Input type="date" value={fields.date} onChange={(e) => setters.setDate(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Heure"><Input type="time" value={fields.heure} onChange={(e) => setters.setHeure(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Durée (min)"><Input type="number" min={1} value={fields.duree} onChange={(e) => setters.setDuree(e.target.value)} disabled={ro} className={inputRo} /></F>
          <F label="Passagers"><Input type="number" min={1} value={fields.passagers} onChange={(e) => setters.setPassagers(e.target.value)} disabled={ro && !annonceEditable} className={inputRo} /></F>
          <F label="Poids total (kg)"><Input type="number" min={0} value={fields.poids} onChange={(e) => setters.setPoids(e.target.value)} disabled={ro && !annonceEditable} placeholder="—" className={inputRo} /></F>
          {isPerso && (
            <F label="Style de vol">
              <Select value={fields.styleVol} onChange={(e) => setters.setStyleVol(e.target.value as Fields["styleVol"])} disabled={ro} className={inputRo}>
                <option value="">—</option>
                <option value="rapide">Itinéraire direct</option>
                <option value="vues">Parcours pittoresque</option>
              </Select>
            </F>
          )}
          {isAdmin && (
            <>
              <F label="Prix demandé (€)"><Input type="number" min={0} value={fields.acompte} onChange={(e) => setters.setAcompte(e.target.value)} placeholder="—" /></F>
              <F label="Montant payé (€)"><Input type="number" min={0} value={fields.paye} onChange={(e) => setters.setPaye(e.target.value)} placeholder="—" /></F>
              <F label="Remboursé (€)"><Input type="number" min={0} value={fields.remboursement} onChange={(e) => setters.setRemboursement(e.target.value)} placeholder="—" /></F>
            </>
          )}
        </div>
        {isAdmin && r.voucher_code && (
          <p className="flex items-center gap-1.5 text-[12px] text-st-warn"><Ticket size={13} /> Prix et montant pré-remplis depuis le voucher {r.voucher_code}</p>
        )}
      </section>

      {isAdmin && (
        <section className="space-y-2.5">
          <h3 className="text-[13px] font-semibold text-st-text">Codes</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <F label="Voucher"><Input value={fields.voucherCode} onChange={(e) => setters.setVoucherCode(e.target.value)} placeholder="—" className="font-mono" /></F>
            <F label="Code promo"><Input value={fields.couponCode} onChange={(e) => setters.setCouponCode(e.target.value)} placeholder="—" className="font-mono" /></F>
          </div>
        </section>
      )}

      <F label="Remarques">
        <Textarea value={fields.commentaire} onChange={(e) => setters.setCommentaire(e.target.value)} disabled={ro} rows={3} placeholder="Notes internes ou remarques du client…" className={inputRo} />
      </F>

      {isAdmin ? (
        <Button fullWidth onClick={onSave} loading={isSaving}><Save /> Enregistrer les modifications</Button>
      ) : annonceEditable ? (
        <Button
          fullWidth
          loading={isSaving}
          onClick={() => ask({
            title: "Modifier passagers / poids ?",
            consequences: ["Le prix par personne peut changer (vente à la place).", "Le centrage du vol change : refaites la masse & centrage."],
            confirmLabel: "Enregistrer",
            run: onSavePassagersPoids,
          })}
        >
          <Save /> Enregistrer passagers / poids
        </Button>
      ) : null}

      {isAdmin && (
        <div className="space-y-2">
          <Fold icon={Calculator} title="Bilan vol" hint={r.duree_reelle != null ? `${r.duree_reelle} min enregistré` : undefined}>
            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
              <div><p className="text-[12px] text-st-muted">Pack</p><p className="font-semibold">{r.duree} min</p></div>
              <div><p className="text-[12px] text-st-muted">Prix demandé</p><p className="font-semibold">{r.acompte != null ? `${r.acompte} €` : "—"}</p></div>
            </div>
            <F label="Durée réelle (min)">
              <Input type="number" min={1} max={r.duree + 120} value={bilan.dureeReelle} onChange={(e) => bilan.setDureeReelle(e.target.value)} placeholder={`pack : ${r.duree} min`} />
            </F>
            {bilan.dureeR > 0 ? (
              <>
                <div className="flex justify-between text-[13px]">
                  <span className="text-st-text-2">Coût avion école{bilan.tarifEcole !== null && <span className="text-st-muted"> ({bilan.tarifEcole} €/h)</span>}</span>
                  {bilan.coutEcole !== null ? <span className="font-semibold text-st-bad">− {bilan.coutEcole.toFixed(2)} €</span> : <span className="text-st-muted">tarif école non renseigné</span>}
                </div>
                {bilan.resultat !== null && (
                  <div className={cn("flex justify-between border-t border-st-line-soft pt-2 text-[14px] font-semibold", bilan.resultat >= 0 ? "text-st-ok" : "text-st-bad")}>
                    <span>Résultat</span>
                    <span>{bilan.resultat >= 0 ? "+" : ""}{bilan.resultat.toFixed(2)} €</span>
                  </div>
                )}
                <Button size="sm" fullWidth onClick={bilan.save} loading={bilan.isPending}><Check /> Enregistrer le bilan vol</Button>
              </>
            ) : (
              <p className="text-[12px] text-st-muted">Entrez la durée réelle pour voir le résultat.</p>
            )}
          </Fold>
          <Fold icon={Mail} title="Email libre et modèles">
            <p className="flex items-center gap-1.5 text-[12px] text-st-muted"><Sparkles size={12} /> Modèles rapides</p>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_TEMPLATES.map((tpl, idx) => (
                <Button key={tpl.label} variant="secondary" size="sm" disabled={isPending} onClick={() => onApplyTemplate(tpl, idx === 0)}>{tpl.label}</Button>
              ))}
            </div>
            <Button variant="secondary" fullWidth onClick={onOpenEmailComposer}><Send /> Écrire un email…</Button>
          </Fold>
        </div>
      )}

      <section>
        <h3 className="mb-1 text-[13px] font-semibold text-st-text">Historique</h3>
        {history.loading && <p className="flex items-center gap-2 py-3 text-[12.5px] text-st-muted"><Loader2 size={14} className="animate-spin" /> Chargement…</p>}
        {history.loaded && history.items.length === 0 && <p className="py-3 text-[12.5px] text-st-muted">Aucune modification enregistrée.</p>}
        {history.loaded && history.items.length > 0 && (
          <ol>
            {history.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2">
                <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-st-line-strong" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-[550] text-st-text">{ACTION_LABELS[item.action] ?? item.action}</span>
                    <span className="shrink-0 text-[11px] text-st-muted">
                      {new Date(item.created_at).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {item.field && (
                    <p className="text-[12px] text-st-text-2">
                      {FIELD_LABELS[item.field] ?? item.field}
                      {item.old_value != null && item.new_value != null && <> · <span className="text-st-muted line-through">{item.old_value}</span> → <span className="font-medium text-st-text">{item.new_value}</span></>}
                      {item.old_value == null && item.new_value != null && <> · <span className="font-medium text-st-text">{item.new_value}</span></>}
                    </p>
                  )}
                  {item.note && <p className="text-[11.5px] italic text-st-muted">{item.note}</p>}
                  <p className="text-[11px] text-st-muted">{authorLabel(item.author)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
