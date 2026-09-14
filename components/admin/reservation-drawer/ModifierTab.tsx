"use client";

import { Ticket, Lock } from "lucide-react";
import type { DrawerReservation } from "./types";

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

const baseInput = "w-full h-8 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-navy/30";
const roInput = "w-full h-8 px-2 rounded-lg border border-border bg-secondary text-sm text-muted-foreground cursor-not-allowed";

// Le bouton de sauvegarde vit dans le footer sticky du drawer (ActionFooter), pas ici —
// cet onglet ne gère que la saisie des champs.
// readOnly (pilote) : les infos sont affichées mais non modifiables, et les champs
// paiement / codes sont masqués (hors périmètre pilote).
// pilotAnnonceEditable (Q33) : sur sa propre annonce, le pilote reste en lecture
// seule partout SAUF passagers/poids — cohérent pour un vol qu'il organise lui-même.
export function ModifierTab({
  reservation: r,
  fields, setters,
  readOnly = false,
  pilotAnnonceEditable = false,
}: {
  reservation: DrawerReservation;
  readOnly?: boolean;
  pilotAnnonceEditable?: boolean;
  fields: {
    prenom: string; nom: string; email: string; telephone: string;
    date: string; heure: string; duree: string; passagers: string; poids: string;
    acompte: string; paye: string; remboursement: string;
    voucherCode: string; couponCode: string; commentaire: string;
    styleVol: "rapide" | "vues" | "";
  };
  setters: {
    setPrenom: (v: string) => void; setNom: (v: string) => void; setEmail: (v: string) => void; setTelephone: (v: string) => void;
    setDate: (v: string) => void; setHeure: (v: string) => void; setDuree: (v: string) => void;
    setPassagers: (v: string) => void; setPoids: (v: string) => void;
    setAcompte: (v: string) => void; setPaye: (v: string) => void; setRemboursement: (v: string) => void;
    setVoucherCode: (v: string) => void; setCouponCode: (v: string) => void; setCommentaire: (v: string) => void;
    setStyleVol: (v: "rapide" | "vues" | "") => void;
  };
}) {
  const isPerso = r.type_resa === "perso";
  const inputCls = readOnly ? roInput : baseInput;
  const ro = readOnly;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

      {readOnly && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-lg px-3 py-2">
          <Lock size={11} className="shrink-0" />
          {pilotAnnonceEditable
            ? "Seuls les passagers et le poids total sont modifiables sur votre annonce. Pour le reste, contactez Romain."
            : "Informations en lecture seule. Pour un changement, contactez Romain."}
        </p>
      )}

      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Client</p>
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <InputField label="Prénom">
              <input type="text" value={fields.prenom} onChange={e => setters.setPrenom(e.target.value)} disabled={ro} className={inputCls} />
            </InputField>
            <InputField label="Nom">
              <input type="text" value={fields.nom} onChange={e => setters.setNom(e.target.value)} disabled={ro} className={inputCls} />
            </InputField>
          </div>
          <InputField label="Email">
            <input type="email" value={fields.email} onChange={e => setters.setEmail(e.target.value)} disabled={ro} className={inputCls} />
          </InputField>
          <InputField label="Téléphone">
            <input type="tel" value={fields.telephone} onChange={e => setters.setTelephone(e.target.value)} disabled={ro} placeholder="Optionnel" className={inputCls} />
          </InputField>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Vol</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <InputField label="Date">
            <input type="date" value={fields.date} onChange={e => setters.setDate(e.target.value)} disabled={ro} className={inputCls} />
          </InputField>
          <InputField label="Heure">
            <input type="time" value={fields.heure} onChange={e => setters.setHeure(e.target.value)} disabled={ro} className={inputCls} />
          </InputField>
          <InputField label="Durée (min)">
            <input type="number" value={fields.duree} onChange={e => setters.setDuree(e.target.value)} disabled={ro} min={1} className={inputCls} />
          </InputField>
          <InputField label="Passagers">
            <input type="number" value={fields.passagers} onChange={e => setters.setPassagers(e.target.value)} disabled={ro && !pilotAnnonceEditable} min={1} className={ro && !pilotAnnonceEditable ? roInput : baseInput} />
          </InputField>
          <InputField label="Poids total (kg)">
            <input type="number" value={fields.poids} onChange={e => setters.setPoids(e.target.value)} disabled={ro && !pilotAnnonceEditable} min={0} placeholder="—" className={ro && !pilotAnnonceEditable ? roInput : baseInput} />
          </InputField>
          {!ro && (
            <>
              <InputField label="Prix demandé au client (€)">
                <input type="number" value={fields.acompte} onChange={e => setters.setAcompte(e.target.value)} min={0} placeholder="—" className={inputCls} />
              </InputField>
              <InputField label="Montant payé (€)">
                <input type="number" value={fields.paye} onChange={e => setters.setPaye(e.target.value)} min={0} placeholder="—" className={inputCls} />
              </InputField>
              <InputField label="Montant remboursé (€)">
                <input type="number" value={fields.remboursement} onChange={e => setters.setRemboursement(e.target.value)} min={0} placeholder="—" className={inputCls} />
              </InputField>
            </>
          )}
          {isPerso && (
            <InputField label="Style de vol">
              <select
                value={fields.styleVol}
                onChange={e => setters.setStyleVol(e.target.value as "rapide" | "vues" | "")}
                disabled={ro}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="rapide">Itinéraire direct</option>
                <option value="vues">Parcours pittoresque</option>
              </select>
            </InputField>
          )}
        </div>
        {!ro && r.voucher_code && (
          <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
            <Ticket size={10} />
            Prix et montant payé pré-remplis depuis le voucher {r.voucher_code}
          </p>
        )}
      </div>

      {!ro && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-3">Codes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <InputField label="Code voucher">
              <input type="text" value={fields.voucherCode} onChange={e => setters.setVoucherCode(e.target.value)} placeholder="—" className={`${inputCls} font-mono`} />
            </InputField>
            <InputField label="Code promo">
              <input type="text" value={fields.couponCode} onChange={e => setters.setCouponCode(e.target.value)} placeholder="—" className={`${inputCls} font-mono`} />
            </InputField>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-2">Remarques</p>
        <textarea
          value={fields.commentaire}
          onChange={e => setters.setCommentaire(e.target.value)}
          disabled={ro}
          rows={3}
          placeholder="Notes internes ou remarques client…"
          className={`w-full px-2.5 py-2 rounded-lg border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-navy/30 placeholder:text-muted-foreground/40 ${
            ro ? "border-border bg-secondary text-muted-foreground cursor-not-allowed" : "border-input bg-background"
          }`}
        />
      </div>
    </div>
  );
}
