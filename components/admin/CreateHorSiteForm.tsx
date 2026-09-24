"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { createHorSiteReservation } from "@/lib/actions/reservations";
import {
  Button, ClientPicker, FormField, Input, SectionHeader, Segmented, Select, Textarea,
  clientDraftError, emptyClientDraft, type PickerClient,
} from "@/components/pilote/studio";
import { cn } from "@/lib/utils";

interface Props {
  clients: PickerClient[];
  prixHeure: number;
}

const eur = (v: number) => `${v.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Vol effectué hors du site (Messenger, téléphone, sur place) : enregistré
// comme effectué et payé, sans email. Formulaire Studio.
export function CreateHorSiteForm({ clients, prixHeure }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [client, setClient] = useState(() => emptyClientDraft("new"));

  const [typeResa, setTypeResa] = useState<"standard" | "perso">("standard");
  const [dateVol, setDateVol] = useState("");
  const [heureVol, setHeureVol] = useState("");
  const [duree, setDuree] = useState<string>("60");
  const [passagers, setPassagers] = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const [prixDuOverride, setPrixDuOverride] = useState<string>("");
  const [montantRecu, setMontantRecu] = useState<string>("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const dureeNum = parseFloat(duree) || 0;

  const prixCalcule = useMemo(() => {
    if (dureeNum <= 0) return 0;
    return Math.round((prixHeure / 60) * dureeNum * 100) / 100;
  }, [prixHeure, dureeNum]);

  const prixDu = useMemo(() => {
    const override = parseFloat(prixDuOverride);
    if (!isNaN(override) && override >= 0) return override;
    return prixCalcule;
  }, [prixDuOverride, prixCalcule]);

  const montantRecuNum = parseFloat(montantRecu) || 0;
  const surplus = montantRecuNum - prixDu;
  const hasSurplus = montantRecu !== "" && prixDu > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dateVol) { setError("La date est obligatoire."); return; }
    if (dureeNum <= 0) { setError("La durée doit être supérieure à 0."); return; }
    const clientError = clientDraftError(client, false);
    if (clientError) { setError(clientError); return; }
    if (montantRecu === "") { setError("Renseignez le montant reçu."); return; }

    startTransition(async () => {
      const isNew = client.mode === "new";
      const result = await createHorSiteReservation({
        client_id: isNew ? undefined : client.selectedId,
        prenom: isNew ? client.prenom : undefined,
        nom: isNew ? client.nom : undefined,
        email: isNew ? (client.email || undefined) : undefined,
        telephone: isNew ? (client.telephone || undefined) : undefined,
        type_resa: typeResa,
        date_vol: dateVol,
        heure_vol: heureVol || undefined,
        duree: Math.round(dureeNum),
        passagers,
        poids_total: poidsTotal ? parseInt(poidsTotal) : null,
        commentaire: commentaire || undefined,
        prix_du: prixDu,
        montant_recu: montantRecuNum,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/pilote/vols"), 1500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Client */}
      <section className="space-y-3.5">
        <SectionHeader title="Client" />
        <ClientPicker clients={clients} value={client} onChange={setClient} emailRequired={false} newFirst />
      </section>

      {/* Vol */}
      <section className="space-y-3.5">
        <SectionHeader title="Le vol" />
        <FormField label="Type de vol">
          <Segmented
            fill
            value={typeResa}
            onChange={setTypeResa}
            items={[{ key: "standard", label: "Standard" }, { key: "perso", label: "Sur mesure" }]}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="h-date" label="Date">
            <Input id="h-date" type="date" value={dateVol} onChange={e => setDateVol(e.target.value)} required />
          </FormField>
          <FormField id="h-heure" label="Heure (facultatif)">
            <Input id="h-heure" type="time" value={heureVol} onChange={e => setHeureVol(e.target.value)} />
          </FormField>
        </div>
        <FormField
          id="h-duree"
          label="Durée réelle (minutes)"
          hint={dureeNum >= 60 ? `Soit ${Math.floor(dureeNum / 60)} h${dureeNum % 60 ? ` ${Math.round(dureeNum % 60)} min` : ""}.` : undefined}
        >
          <Input id="h-duree" type="number" inputMode="numeric" min="1" step="1" value={duree} onChange={e => setDuree(e.target.value)} placeholder="55" />
        </FormField>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="h-pax" label="Passagers">
            <Select id="h-pax" value={passagers} onChange={e => setPassagers(parseInt(e.target.value))}>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </FormField>
          <FormField id="h-poids" label="Poids total (kg)">
            <Input id="h-poids" type="number" inputMode="numeric" min="0" value={poidsTotal} onChange={e => setPoidsTotal(e.target.value)} placeholder="180" />
          </FormField>
        </div>
        <FormField id="h-comment" label="Notes">
          <Textarea id="h-comment" className="min-h-16 resize-none" value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={2} placeholder="Route, conditions, remarques…" />
        </FormField>
      </section>

      {/* Finances */}
      <section className="space-y-3.5">
        <div>
          <SectionHeader title="Finances" />
          <p className="mt-0.5 text-[12.5px] text-st-muted">Enregistré comme vol effectué et payé. Aucun email n&apos;est envoyé.</p>
        </div>
        {dureeNum > 0 && (
          <div className="flex items-baseline justify-between gap-3 rounded-[14px] bg-st-surface px-4 py-3">
            <span className="text-[13px] text-st-text-2">Prix calculé ({dureeNum} min à {prixHeure} €/h)</span>
            <span className="st-num text-lg font-semibold text-st-text">{eur(prixCalcule)}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="h-du" label="Prix dû" hint="Vide : prix calculé.">
            <Input id="h-du" type="number" inputMode="decimal" min="0" step="0.01" value={prixDuOverride} onChange={e => setPrixDuOverride(e.target.value)} placeholder={prixCalcule.toFixed(2)} />
          </FormField>
          <FormField id="h-recu" label="Montant reçu">
            <Input id="h-recu" type="number" inputMode="decimal" min="0" step="0.01" value={montantRecu} onChange={e => setMontantRecu(e.target.value)} placeholder="250.00" />
          </FormField>
        </div>
        {hasSurplus && (
          <div className={cn(
            "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[13px]",
            surplus >= 0 ? "bg-st-ok-soft text-st-ok" : "bg-st-bad-soft text-st-bad",
          )}>
            {surplus >= 0 ? <TrendingUp size={15} className="shrink-0" /> : <TrendingDown size={15} className="shrink-0" />}
            <span>
              {surplus >= 0 ? "Surplus" : "Déficit"} : <b className="st-num">{surplus >= 0 ? "+" : ""}{eur(surplus)}</b>
              <span className="ml-1.5 text-xs opacity-75">({eur(montantRecuNum)} reçu, {eur(prixDu)} dû)</span>
            </span>
          </div>
        )}
      </section>

      <div className="space-y-3">
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
        {success && (
          <p className="flex items-center gap-2 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
            <Check size={15} className="shrink-0" />
            Vol hors site enregistré. Redirection…
          </p>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-2.5">
          <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={() => router.push("/pilote/vols")}>
            Annuler
          </Button>
          <Button type="submit" size="lg" className="sm:h-[38px] sm:text-[13px]" loading={isPending} disabled={success}>
            Enregistrer le vol
          </Button>
        </div>
      </div>
    </form>
  );
}
