"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, CircleCheck } from "lucide-react";
import { createAdminReservation } from "@/lib/actions/reservations";
import {
  Button, ChoiceCard, ClientPicker, FormField, Input, SectionHeader, Segmented, Select,
  clientDraftError, emptyClientDraft, type PickerClient,
} from "@/components/pilote/studio";

interface Props {
  clients: PickerClient[];
  prixHeure: number;
}

const DUREES = ["30", "60", "90", "120"] as const;

// Nouvelle réservation créée par le pilote (client au téléphone, par email…).
// Formulaire Studio : sans cartes, trois sections, validation pleine largeur.
export function CreateReservationForm({ clients, prixHeure }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [client, setClient] = useState(() => emptyClientDraft("existing"));

  const [dateVol, setDateVol] = useState("");
  const [heureVol, setHeureVol] = useState("10:00");
  const [duree, setDuree] = useState(60);
  const [passagers, setPassagers] = useState(1);
  const [poidsTotal, setPoidsTotal] = useState("");
  const [voucherCode, setVoucherCode] = useState("");

  const [envoyerPaiement, setEnvoyerPaiement] = useState(true);
  const [montantOverride, setMontantOverride] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const prixCalcule = Math.round((prixHeure / 60) * duree);
  const prixEstime = useMemo(() => {
    const override = parseFloat(montantOverride);
    if (!isNaN(override) && override >= 0) return override;
    return prixCalcule;
  }, [prixCalcule, montantOverride]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!dateVol) { setError("La date est obligatoire."); return; }
    if (!heureVol) { setError("L'heure est obligatoire."); return; }
    const clientError = clientDraftError(client, true);
    if (clientError) { setError(clientError); return; }

    startTransition(async () => {
      const override = parseFloat(montantOverride);
      const isNew = client.mode === "new";
      const result = await createAdminReservation({
        client_id: isNew ? undefined : client.selectedId,
        prenom: isNew ? client.prenom : undefined,
        nom: isNew ? client.nom : undefined,
        email: isNew ? client.email : undefined,
        telephone: isNew ? client.telephone : undefined,
        date_vol: dateVol,
        heure_vol: heureVol,
        duree,
        passagers,
        poids_total: poidsTotal ? parseInt(poidsTotal) : null,
        voucher_code: voucherCode || undefined,
        envoyer_paiement: envoyerPaiement,
        montant_override: !isNaN(override) && override >= 0 ? override : null,
        send_email: sendEmail,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!sendEmail) setSuccess("Réservation créée, aucun email envoyé.");
      else if (envoyerPaiement && prixEstime > 0) setSuccess("Réservation créée, lien de paiement envoyé au client.");
      else setSuccess("Réservation créée et confirmée.");
      setTimeout(() => router.push("/pilote/vols"), 1500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Client */}
      <section className="space-y-3.5">
        <SectionHeader title="Client" />
        <ClientPicker clients={clients} value={client} onChange={setClient} />
      </section>

      {/* Vol */}
      <section className="space-y-3.5">
        <SectionHeader title="Le vol" />
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="r-date" label="Date">
            <Input id="r-date" type="date" value={dateVol} onChange={e => setDateVol(e.target.value)} required />
          </FormField>
          <FormField id="r-heure" label="Heure de départ">
            <Input id="r-heure" type="time" value={heureVol} onChange={e => setHeureVol(e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Durée">
          <Segmented
            fill
            value={String(duree) as (typeof DUREES)[number]}
            onChange={(v) => setDuree(Number(v))}
            items={DUREES.map(d => ({ key: d, label: `${d} min` }))}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField id="r-pax" label="Passagers">
            <Select id="r-pax" value={passagers} onChange={e => setPassagers(parseInt(e.target.value))}>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </FormField>
          <FormField id="r-poids" label="Poids total (kg)">
            <Input id="r-poids" type="number" inputMode="numeric" min="0" value={poidsTotal} onChange={e => setPoidsTotal(e.target.value)} placeholder="180" />
          </FormField>
        </div>
        <FormField id="r-voucher" label="Code voucher (facultatif)">
          <Input id="r-voucher" className="font-mono" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" />
        </FormField>
      </section>

      {/* Paiement */}
      <section className="space-y-3.5">
        <SectionHeader title="Paiement" />
        <div className="flex items-baseline justify-between gap-3 rounded-[14px] bg-st-surface px-4 py-3">
          <span className="text-[13px] text-st-text-2">Prix calculé ({duree} min à {prixHeure} €/h)</span>
          <span className="st-num text-lg font-semibold text-st-text">{prixEstime} €</span>
        </div>
        <FormField id="r-montant" label="Montant personnalisé" hint="Vide : le prix calculé est utilisé.">
          <Input id="r-montant" type="number" inputMode="decimal" min="0" step="1" value={montantOverride} onChange={e => setMontantOverride(e.target.value)} placeholder={`${prixCalcule} €`} />
        </FormField>
        <div className="space-y-2">
          <ChoiceCard
            selected={envoyerPaiement}
            onClick={() => setEnvoyerPaiement(true)}
            icon={CreditCard}
            title="Envoyer un lien de paiement"
            desc={`Le client reçoit un email avec un lien Stripe sécurisé (${prixEstime} €).`}
          />
          <ChoiceCard
            selected={!envoyerPaiement}
            onClick={() => setEnvoyerPaiement(false)}
            icon={CircleCheck}
            title="Confirmer sans paiement en ligne"
            desc="Espèces ou virement : la réservation passe directement en attente."
          />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-st-surface px-4 py-3">
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0b2238]" />
          <span>
            <span className="block text-[13.5px] font-semibold text-st-text">Envoyer un email au client</span>
            <span className="mt-0.5 block text-xs leading-snug text-st-muted">
              Décochez pour créer la réservation sans prévenir le client (route ou dossier encore en préparation).
            </span>
          </span>
        </label>
      </section>

      <div className="space-y-3">
        {error && <p className="rounded-[12px] bg-st-bad-soft px-3.5 py-2.5 text-[13px] text-st-bad">{error}</p>}
        {success && (
          <p className="flex items-center gap-2 rounded-[12px] bg-st-ok-soft px-3.5 py-2.5 text-[13px] text-st-ok">
            <Check size={15} className="shrink-0" />
            {success}
          </p>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-2.5">
          <Button variant="secondary" size="lg" className="sm:h-[38px] sm:text-[13px]" onClick={() => router.push("/pilote/vols")}>
            Annuler
          </Button>
          <Button type="submit" size="lg" className="sm:h-[38px] sm:text-[13px]" loading={isPending} disabled={!!success}>
            <span className="truncate">{envoyerPaiement && sendEmail ? "Créer et envoyer le lien" : "Créer la réservation"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
